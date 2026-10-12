BEGIN;

CREATE OR REPLACE FUNCTION public.normalize_afghan_phone(p_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits text := regexp_replace(coalesce(p_phone,''),'[^0-9]','','g');
BEGIN
  IF digits LIKE '0093%' THEN digits := substring(digits FROM 3); END IF;
  IF length(digits)=11 AND digits LIKE '93%' THEN digits := '0'||substring(digits FROM 3); END IF;
  IF length(digits)=9 AND digits LIKE '7%' THEN digits := '0'||digits; END IF;
  RETURN digits;
END $$;

CREATE OR REPLACE FUNCTION public.register_customer_and_create_session(
  p_id text,
  p_name text,
  p_email text,
  p_phone text,
  p_password text,
  p_tazkira text,
  p_city text,
  p_token_hash text,
  p_expires_at timestamptz
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,extensions
AS $$
DECLARE
  normalized_phone text := public.normalize_afghan_phone(p_phone);
  normalized_email text;
  tazkira_digits text := regexp_replace(coalesce(p_tazkira,''),'[^0-9]','','g');
  created public.staff_users;
BEGIN
  IF length(normalized_phone)<>10 OR normalized_phone NOT LIKE '07%' THEN
    RETURN jsonb_build_object('success',false,'reason','invalid_phone');
  END IF;
  IF length(trim(coalesce(p_name,'')))<2 THEN
    RETURN jsonb_build_object('success',false,'reason','invalid_name');
  END IF;
  IF length(coalesce(p_password,''))<6 THEN
    RETURN jsonb_build_object('success',false,'reason','weak_password');
  END IF;
  IF length(tazkira_digits)<>13 THEN
    RETURN jsonb_build_object('success',false,'reason','invalid_tazkira');
  END IF;

  normalized_email := lower(trim(coalesce(nullif(p_email,''),'cust_'||normalized_phone||'@rayancustomer.af')));
  PERFORM pg_advisory_xact_lock(hashtext('customer:'||normalized_phone));

  IF EXISTS(
    SELECT 1 FROM public.staff_users
    WHERE role='customer' AND public.normalize_afghan_phone(phone)=normalized_phone
  ) THEN
    RETURN jsonb_build_object('success',false,'reason','phone_exists');
  END IF;
  IF EXISTS(SELECT 1 FROM public.staff_users WHERE lower(email)=normalized_email) THEN
    RETURN jsonb_build_object('success',false,'reason','email_exists');
  END IF;

  INSERT INTO public.staff_users(
    id,branch_id,name,email,phone,role,password_hash,status,preferences
  ) VALUES (
    p_id,NULL,trim(p_name),normalized_email,normalized_phone,'customer',
    crypt(p_password,gen_salt('bf',10)),'active',
    jsonb_build_object(
      'tazkiraNumber',
      substring(tazkira_digits FROM 1 FOR 4)||'-'||substring(tazkira_digits FROM 5 FOR 4)||'-'||substring(tazkira_digits FROM 9 FOR 5),
      'city',trim(coalesce(p_city,''))
    )
  )
  RETURNING * INTO created;

  INSERT INTO public.staff_sessions(token_hash,staff_user_id,expires_at)
  VALUES(p_token_hash,created.id,p_expires_at);
  UPDATE public.staff_users SET last_login_at=now() WHERE id=created.id;

  RETURN jsonb_build_object(
    'success',true,
    'user',jsonb_build_object(
      'id',created.id,'name',created.name,'email',created.email,'phone',created.phone,
      'role',created.role,'branchId','customer','status',created.status,
      'preferences',created.preferences,'createdAt',created.created_at,'lastLogin',now()
    )
  );
END $$;

CREATE OR REPLACE FUNCTION public.create_staff_session(
  p_identifier text,
  p_password text,
  p_token_hash text,
  p_expires_at timestamptz
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,extensions
AS $$
DECLARE
  matched public.staff_users;
  candidate public.staff_users;
  normalized_identifier text := public.normalize_afghan_phone(p_identifier);
  password_valid boolean := false;
BEGIN
  SELECT * INTO matched
  FROM public.staff_users
  WHERE status='active'
    AND (lower(email)=lower(trim(p_identifier)) OR lower(id)=lower(trim(p_identifier)))
  LIMIT 1;

  IF matched.id IS NOT NULL THEN
    password_valid := matched.password_hash=crypt(p_password,matched.password_hash);
    IF NOT password_valid AND matched.legacy_password_hash IS NOT NULL THEN
      password_valid := matched.legacy_password_hash=crypt(p_password,matched.legacy_password_hash);
    END IF;
  ELSIF length(normalized_identifier)=10 AND normalized_identifier LIKE '07%' THEN
    FOR candidate IN
      SELECT * FROM public.staff_users
      WHERE status='active'
        AND public.normalize_afghan_phone(phone)=normalized_identifier
      ORDER BY created_at DESC
      LIMIT 10
    LOOP
      password_valid := candidate.password_hash=crypt(p_password,candidate.password_hash);
      IF NOT password_valid AND candidate.legacy_password_hash IS NOT NULL THEN
        password_valid := candidate.legacy_password_hash=crypt(p_password,candidate.legacy_password_hash);
      END IF;
      IF password_valid THEN matched:=candidate; EXIT; END IF;
    END LOOP;
  END IF;

  IF matched.id IS NULL OR NOT password_valid THEN RETURN NULL; END IF;

  DELETE FROM public.staff_sessions
  WHERE staff_user_id=matched.id AND (expires_at<now() OR revoked_at IS NOT NULL);
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

REVOKE ALL ON FUNCTION public.register_customer_and_create_session(text,text,text,text,text,text,text,text,timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.normalize_afghan_phone(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_staff_session(text,text,text,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_customer_and_create_session(text,text,text,text,text,text,text,text,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.normalize_afghan_phone(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_staff_session(text,text,text,timestamptz) TO service_role;

COMMIT;
NOTIFY pgrst, 'reload schema';
