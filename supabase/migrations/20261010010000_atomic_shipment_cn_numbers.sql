BEGIN;

CREATE SEQUENCE IF NOT EXISTS public.shipment_cn_number_seq
  AS bigint
  START WITH 1500
  INCREMENT BY 1;

-- Continue after the largest canonical ARM number already stored.
SELECT setval(
  'public.shipment_cn_number_seq',
  greatest(
    1499,
    coalesce((
      SELECT max((regexp_match(cn_number, '^ARM-([0-9]+)$'))[1]::bigint)
      FROM public.shipments
      WHERE cn_number ~ '^ARM-[0-9]+$'
    ), 1499)
  ),
  true
);

CREATE OR REPLACE FUNCTION public.next_shipment_cn()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path=public
AS $$
  SELECT 'ARM-' || nextval('public.shipment_cn_number_seq')::text
$$;

REVOKE ALL ON FUNCTION public.next_shipment_cn() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_shipment_cn() TO service_role;

COMMIT;

