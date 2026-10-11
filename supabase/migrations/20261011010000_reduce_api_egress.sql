BEGIN;

CREATE INDEX IF NOT EXISTS shipments_updated_at_idx ON public.shipments(updated_at DESC);
CREATE INDEX IF NOT EXISTS shipments_customer_updated_idx ON public.shipments(customer_user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS shipments_origin_updated_idx ON public.shipments(origin_branch_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS shipments_destination_updated_idx ON public.shipments(destination_branch_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS shipments_current_branch_updated_idx ON public.shipments(current_branch_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS branch_expenses_updated_at_idx ON public.branch_expenses(updated_at DESC);
CREATE INDEX IF NOT EXISTS branch_settlements_updated_at_idx ON public.branch_settlements(updated_at DESC);

-- Aggregate inside PostgreSQL so the API returns one compact report instead of
-- transferring every shipment's financial JSON and every expense to an Edge Function.
CREATE OR REPLACE FUNCTION public.get_revenue_overview()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH shipment_totals AS (
    SELECT
      b.id AS branch_id,
      COALESCE(SUM(CASE WHEN s.origin_branch_id = b.id OR s.destination_branch_id = b.id
        THEN COALESCE(NULLIF(s.financials->>'totalAmount','')::numeric, NULLIF(s.financials->>'productPrice','')::numeric, 0) ELSE 0 END), 0) AS gross,
      COALESCE(SUM(CASE WHEN s.origin_branch_id = b.id OR s.destination_branch_id = b.id
        THEN COALESCE(s.dest_branch_commission, NULLIF(s.financials->>'destBranchCommission','')::numeric, 0) ELSE 0 END), 0) AS commissions,
      COUNT(*) FILTER (WHERE s.origin_branch_id = b.id) AS dispatched,
      COUNT(*) FILTER (WHERE s.destination_branch_id = b.id) AS received
    FROM public.branches b
    LEFT JOIN public.shipments s ON s.origin_branch_id = b.id OR s.destination_branch_id = b.id
    GROUP BY b.id
  ), expense_totals AS (
    SELECT branch_id, COALESCE(SUM(amount), 0) AS costs
    FROM public.branch_expenses GROUP BY branch_id
  ), rows AS (
    SELECT b.id AS "branchId", b.name, b.name_fa AS "nameFa", b.name_ps AS "namePs", b.code, b.city, b.province,
      st.gross AS "grossFreight", st.gross AS "destCodCollected", st.commissions AS "destCommission",
      COALESCE(et.costs, 0) AS expenses, st.gross - st.commissions - COALESCE(et.costs, 0) AS "netProfit",
      CASE WHEN st.gross = 0 THEN 0 ELSE (st.gross - st.commissions - COALESCE(et.costs, 0)) / st.gross * 100 END AS "profitMarginPercent",
      st.dispatched AS "dispatchedVolume", st.received AS "receivedVolume"
    FROM public.branches b
    JOIN shipment_totals st ON st.branch_id = b.id
    LEFT JOIN expense_totals et ON et.branch_id = b.id
  ), totals AS (
    SELECT COALESCE(SUM("grossFreight"),0) gross, COALESCE(SUM("destCommission"),0) commissions,
      COALESCE(SUM(expenses),0) costs, COALESCE(SUM("netProfit"),0) net FROM rows
  )
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'consolidatedGrossFreight', gross,
      'consolidatedDestCommissions', commissions,
      'consolidatedExpenses', costs,
      'consolidatedNetProfit', net,
      'consolidatedMarginPercent', CASE WHEN gross = 0 THEN 0 ELSE net / gross * 100 END
    ),
    'branches', COALESCE((SELECT jsonb_agg(to_jsonb(rows) ORDER BY name) FROM rows), '[]'::jsonb)
  ) FROM totals;
$$;

REVOKE ALL ON FUNCTION public.get_revenue_overview() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_revenue_overview() TO service_role;

COMMIT;
NOTIFY pgrst, 'reload schema';
