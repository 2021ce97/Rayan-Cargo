BEGIN;

CREATE TABLE IF NOT EXISTS public.branch_credential_secrets (
  branch_id text PRIMARY KEY REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE CASCADE,
  staff_user_id text NOT NULL UNIQUE REFERENCES public.staff_users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  encrypted_password text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.branch_credential_secrets IS
  'AES-GCM encrypted branch passwords for explicit Super Admin recovery through the backend Edge Function only.';

ALTER TABLE public.branch_credential_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.branch_credential_secrets FROM anon, authenticated;
GRANT ALL ON public.branch_credential_secrets TO service_role;

COMMIT;
NOTIFY pgrst, 'reload schema';
