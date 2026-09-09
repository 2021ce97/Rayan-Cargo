-- Persist one-time customer bill submission and align remittance states.
ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS customer_submission_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customer_submission_reference VARCHAR(128),
  ADD COLUMN IF NOT EXISTS customer_submission_by VARCHAR(128);

ALTER TABLE public.shipments
  DROP CONSTRAINT IF EXISTS shipments_remittance_status_check;

ALTER TABLE public.shipments
  ADD CONSTRAINT shipments_remittance_status_check
  CHECK (remittance_status IN ('pending', 'submitted_to_headoffice', 'settled', 'not_applicable'));

ALTER TABLE public.branch_settlements
  ADD COLUMN IF NOT EXISTS transportation_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS origin_branch_commission NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS total_commission_kept NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS parcel_ids JSONB NOT NULL DEFAULT '[]'::jsonb;