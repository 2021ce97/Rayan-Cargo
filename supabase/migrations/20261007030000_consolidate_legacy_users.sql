BEGIN;

ALTER TABLE public.staff_users
  ADD COLUMN IF NOT EXISTS legacy_password_hash text;

CREATE TABLE IF NOT EXISTS public.legacy_user_migration_quarantine (
  id text PRIMARY KEY,
  reason text NOT NULL,
  sanitized_payload jsonb NOT NULL,
  quarantined_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.legacy_user_migration_quarantine ENABLE ROW LEVEL SECURITY;

-- Quarantine only sanitized metadata. Plaintext passwords are never copied here.
INSERT INTO public.legacy_user_migration_quarantine(id,reason,sanitized_payload)
SELECT
  u.id,
  concat_ws('; ',
    CASE WHEN u.role NOT IN ('branch_manager','customer','super_admin') THEN 'unsupported role' END,
    CASE WHEN nullif(trim(coalesce(u.email,'')),'') IS NULL THEN 'missing email' END,
    CASE WHEN u.role='branch_manager' AND NOT EXISTS(SELECT 1 FROM public.branches b WHERE b.id=u.branch_id) THEN 'unknown branch_id' END,
    CASE WHEN coalesce(nullif(to_jsonb(u)->>'password',''),nullif(to_jsonb(u)->>'password_hash','')) IS NULL THEN 'missing credential' END
  ),
  to_jsonb(u)-'password'-'password_hash'
FROM public.users u
WHERE
  u.role NOT IN ('branch_manager','customer','super_admin')
  OR nullif(trim(coalesce(u.email,'')),'') IS NULL
  OR (u.role='branch_manager' AND NOT EXISTS(SELECT 1 FROM public.branches b WHERE b.id=u.branch_id))
  OR coalesce(nullif(to_jsonb(u)->>'password',''),nullif(to_jsonb(u)->>'password_hash','')) IS NULL
ON CONFLICT(id) DO UPDATE SET
  reason=excluded.reason,
  sanitized_payload=excluded.sanitized_payload,
  quarantined_at=now();

-- Ensure any legacy Super Admin metadata is retained before removing users.
INSERT INTO public.super_admin_profiles(auth_user_id,legacy_user_id,name,email,phone,status,avatar,preferences,created_at)
SELECT
  au.id,u.id,u.name,lower(u.email),u.phone,
  coalesce(nullif(to_jsonb(u)->>'status',''),'active'),
  to_jsonb(u)->>'avatar',
  coalesce((to_jsonb(u)->'preferences'),'{}'::jsonb),
  coalesce(u.created_at,now())
FROM public.users u
JOIN auth.users au ON lower(au.email)=lower(u.email)
WHERE u.role='super_admin'
ON CONFLICT(auth_user_id) DO UPDATE SET
  legacy_user_id=excluded.legacy_user_id,name=excluded.name,email=excluded.email,
  phone=excluded.phone,status=excluded.status,avatar=excluded.avatar,preferences=excluded.preferences;

DO $$
DECLARE
  legacy record;
  target_id text;
  credential text;
  credential_hash text;
BEGIN
  FOR legacy IN
    SELECT u.*
    FROM public.users u
    WHERE u.role IN ('branch_manager','customer')
      AND nullif(trim(coalesce(u.email,'')),'') IS NOT NULL
      AND (u.role='customer' OR EXISTS(SELECT 1 FROM public.branches b WHERE b.id=u.branch_id))
      AND coalesce(nullif(to_jsonb(u)->>'password',''),nullif(to_jsonb(u)->>'password_hash','')) IS NOT NULL
  LOOP
    credential := coalesce(nullif(to_jsonb(legacy)->>'password',''),nullif(to_jsonb(legacy)->>'password_hash',''));
    credential_hash := CASE
      WHEN credential ~ '^\$2[aby]\$' THEN credential
      ELSE crypt(credential,gen_salt('bf',10))
    END;

    -- Prefer an already-created canonical row with the same email, then the same ID.
    SELECT s.id INTO target_id
    FROM public.staff_users s
    WHERE lower(s.email)=lower(legacy.email) OR s.id=legacy.id
    ORDER BY CASE WHEN lower(s.email)=lower(legacy.email) THEN 0 ELSE 1 END
    LIMIT 1;

    IF target_id IS NULL THEN
      target_id := legacy.id;
      INSERT INTO public.staff_users(
        id,branch_id,name,email,phone,role,password_hash,password_changed_by_branch,
        last_password_change,status,avatar,preferences,created_at
      ) VALUES (
        legacy.id,
        CASE WHEN legacy.role='customer' THEN NULL ELSE legacy.branch_id END,
        legacy.name,lower(legacy.email),coalesce(legacy.phone,''),legacy.role,
        credential_hash,
        coalesce((to_jsonb(legacy)->>'password_changed_by_branch')::boolean,false),
        nullif(to_jsonb(legacy)->>'last_password_change','')::timestamptz,
        coalesce(nullif(to_jsonb(legacy)->>'status',''),'active'),
        to_jsonb(legacy)->>'avatar',
        coalesce(to_jsonb(legacy)->'preferences','{}'::jsonb),
        coalesce(legacy.created_at,now())
      );
    ELSE
      UPDATE public.staff_users
      SET
        branch_id=CASE WHEN legacy.role='customer' THEN NULL ELSE legacy.branch_id END,
        name=legacy.name,
        email=lower(legacy.email),
        phone=coalesce(legacy.phone,staff_users.phone),
        role=legacy.role,
        legacy_password_hash=CASE
          WHEN staff_users.password_hash=credential_hash THEN staff_users.legacy_password_hash
          ELSE credential_hash
        END,
        status=coalesce(nullif(to_jsonb(legacy)->>'status',''),staff_users.status),
        avatar=coalesce(to_jsonb(legacy)->>'avatar',staff_users.avatar),
        preferences=coalesce(to_jsonb(legacy)->'preferences',staff_users.preferences)
      WHERE id=target_id;
    END IF;

    UPDATE public.shipments SET customer_user_id=target_id WHERE customer_user_id=legacy.id AND target_id<>legacy.id;
    UPDATE public.shipments SET booked_by_user_id=target_id WHERE booked_by_user_id=legacy.id AND target_id<>legacy.id;
  END LOOP;
END $$;

-- Verify either the current password or the migrated legacy password, but only
-- after resolving one account. This keeps authentication within statement limits.
CREATE OR REPLACE FUNCTION public.create_staff_session(
  p_identifier text,
  p_password text,
  p_token_hash text,
  p_expires_at timestamptz
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE
  matched public.staff_users;
  password_valid boolean;
BEGIN
  SELECT * INTO matched
  FROM public.staff_users
  WHERE status='active'
    AND (
      lower(email)=lower(trim(p_identifier))
      OR lower(id)=lower(trim(p_identifier))
      OR (
        length(regexp_replace(p_identifier,'[^0-9]','','g')) >= 5
        AND regexp_replace(phone,'[^0-9]','','g')=regexp_replace(p_identifier,'[^0-9]','','g')
      )
    )
  LIMIT 1;

  IF matched.id IS NULL THEN RETURN NULL; END IF;
  password_valid := matched.password_hash=crypt(p_password,matched.password_hash);
  IF NOT password_valid AND matched.legacy_password_hash IS NOT NULL THEN
    password_valid := matched.legacy_password_hash=crypt(p_password,matched.legacy_password_hash);
  END IF;
  IF NOT password_valid THEN RETURN NULL; END IF;

  DELETE FROM public.staff_sessions
  WHERE staff_user_id=matched.id AND (expires_at < now() OR revoked_at IS NOT NULL);
  INSERT INTO public.staff_sessions(token_hash,staff_user_id,expires_at)
  VALUES(p_token_hash,matched.id,p_expires_at);
  UPDATE public.staff_users SET last_login_at=now() WHERE id=matched.id;

  RETURN jsonb_build_object(
    'id',matched.id,'name',matched.name,'email',matched.email,'phone',matched.phone,
    'role',matched.role,'branchId',coalesce(matched.branch_id,'customer'),
    'status',matched.status,'avatar',matched.avatar,'preferences',matched.preferences,
    'createdAt',matched.created_at,'lastLogin',now()
  );
END $$;

CREATE OR REPLACE FUNCTION public.set_staff_password(p_user_id text,p_password text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public,extensions AS $$
  UPDATE public.staff_users
  SET password_hash=crypt(p_password,gen_salt('bf',10)),
      legacy_password_hash=NULL,
      password_changed_by_branch=true,last_password_change=now()
  WHERE id=p_user_id
$$;

REVOKE ALL ON FUNCTION public.create_staff_session(text,text,text,timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_staff_password(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_staff_session(text,text,text,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_staff_password(text,text) TO service_role;

-- Remove foreign keys that still point to the legacy users table. The shipment
-- customer reference is recreated against the canonical staff_users table.
DO $$
DECLARE dependency record;
BEGIN
  FOR dependency IN
    SELECT conrelid::regclass AS table_name,conname
    FROM pg_constraint
    WHERE contype='f' AND confrelid='public.users'::regclass
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I',dependency.table_name,dependency.conname);
  END LOOP;
END $$;

ALTER TABLE public.shipments
  DROP CONSTRAINT IF EXISTS shipments_customer_user_fk;
ALTER TABLE public.shipments
  ADD CONSTRAINT shipments_customer_user_fk
  FOREIGN KEY(customer_user_id) REFERENCES public.staff_users(id)
  ON UPDATE CASCADE ON DELETE SET NULL NOT VALID;

DROP TABLE public.users;

COMMIT;
NOTIFY pgrst, 'reload schema';
