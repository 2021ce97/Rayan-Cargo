BEGIN;

CREATE OR REPLACE FUNCTION public.create_staff_session(
  p_identifier text,
  p_password text,
  p_token_hash text,
  p_expires_at timestamptz
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE
  matched public.staff_users;
BEGIN
  -- Resolve one indexed candidate before running bcrypt. Keeping crypt() out of
  -- the scan predicate prevents a password hash calculation for every staff row.
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
  IF matched.password_hash IS NULL OR matched.password_hash <> crypt(p_password,matched.password_hash) THEN
    RETURN NULL;
  END IF;

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

CREATE OR REPLACE FUNCTION public.register_customer_with_password(
  p_id text, p_name text, p_email text, p_phone text, p_password text, p_preferences jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path=public,extensions AS $$
  INSERT INTO public.staff_users(id,branch_id,name,email,phone,role,password_hash,status,preferences)
  VALUES(p_id,NULL,p_name,lower(p_email),p_phone,'customer',crypt(p_password,gen_salt('bf',10)),'active',p_preferences)
$$;

CREATE OR REPLACE FUNCTION public.set_staff_password(p_user_id text,p_password text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public,extensions AS $$
  UPDATE public.staff_users
  SET password_hash=crypt(p_password,gen_salt('bf',10)),
      password_changed_by_branch=true,last_password_change=now()
  WHERE id=p_user_id
$$;

REVOKE ALL ON FUNCTION public.create_staff_session(text,text,text,timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.register_customer_with_password(text,text,text,text,text,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_staff_password(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_staff_session(text,text,text,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.register_customer_with_password(text,text,text,text,text,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_staff_password(text,text) TO service_role;

COMMIT;
NOTIFY pgrst, 'reload schema';
