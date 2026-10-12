BEGIN;

-- Columns already used by the shipment UI and Edge Function. Older projects
-- created from the original schema may not have received these additions.
ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS seller_payout_status text,
  ADD COLUMN IF NOT EXISTS seller_payout_disbursed_at timestamptz,
  ADD COLUMN IF NOT EXISTS seller_payout_method text,
  ADD COLUMN IF NOT EXISTS seller_payout_voucher_ref text,
  ADD COLUMN IF NOT EXISTS seller_payout_disbursed_by_branch_id text,
  ADD COLUMN IF NOT EXISTS seller_payout_disbursed_by_user_name text,
  ADD COLUMN IF NOT EXISTS seller_payout_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS seller_payout_dispute_reason text,
  ADD COLUMN IF NOT EXISTS seller_payout_notes text;

-- Compatibility fields used by remittance creation and reporting.
ALTER TABLE public.branch_settlements
  ADD COLUMN IF NOT EXISTS branch_id text,
  ADD COLUMN IF NOT EXISTS paying_branch_id text,
  ADD COLUMN IF NOT EXISTS receiving_branch_id text,
  ADD COLUMN IF NOT EXISTS settlement_type text,
  ADD COLUMN IF NOT EXISTS amount_afn numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipments_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipment_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS commission_adjustment_type text NOT NULL DEFAULT 'exact',
  ADD COLUMN IF NOT EXISTS commission_adjustment_amount numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_adjustment_reason text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS transport_adjustment_type text NOT NULL DEFAULT 'exact',
  ADD COLUMN IF NOT EXISTS transport_adjustment_amount numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transport_adjustment_reason text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS settlement_date timestamptz,
  ADD COLUMN IF NOT EXISTS settled_by_user_id text,
  ADD COLUMN IF NOT EXISTS reference_number text,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS status text;

UPDATE public.branch_settlements
SET
  branch_id=coalesce(branch_id,destination_branch_id),
  paying_branch_id=coalesce(paying_branch_id,destination_branch_id),
  receiving_branch_id=coalesce(receiving_branch_id,origin_branch_id),
  settlement_date=coalesce(settlement_date,settled_at,created_at),
  amount_afn=CASE WHEN amount_afn=0 THEN net_remitted_amount ELSE amount_afn END,
  shipments_count=CASE WHEN shipments_count=0 THEN jsonb_array_length(coalesce(parcel_ids,'[]'::jsonb)) ELSE shipments_count END,
  shipment_ids=CASE WHEN shipment_ids='[]'::jsonb THEN coalesce(parcel_ids,'[]'::jsonb) ELSE shipment_ids END,
  reference_number=coalesce(reference_number,sarafi_reference_no),
  payment_method=coalesce(payment_method,settlement_channel),
  status=coalesce(status,settlement_status);

CREATE INDEX IF NOT EXISTS shipments_seller_payout_status_idx
  ON public.shipments(seller_payout_status)
  WHERE seller_payout_status IS NOT NULL;

COMMIT;
NOTIFY pgrst, 'reload schema';

