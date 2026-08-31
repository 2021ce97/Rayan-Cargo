-- ==============================================================================
-- RAYAN CARGO & LOGISTICS AFGHANISTAN
-- SUPABASE POSTGRESQL MIGRATION: REVENUE OVERVIEW & SETTLEMENT TABLES
-- File: /supabase/migrations/20260831_revenue_and_settlement_tables.sql
-- ==============================================================================

-- 1. INTER-BRANCH FINANCIAL SETTLEMENTS & SARAFI HAWALA TABLE
CREATE TABLE IF NOT EXISTS public.branch_settlements (
    id VARCHAR(64) PRIMARY KEY,
    shipment_id VARCHAR(64) REFERENCES public.shipments(id) ON DELETE CASCADE,
    cn_number VARCHAR(64) NOT NULL,
    origin_branch_id VARCHAR(64) NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    destination_branch_id VARCHAR(64) NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    gross_collected_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    dest_branch_commission NUMERIC(12, 2) NOT NULL DEFAULT 100.0,
    net_remitted_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    settlement_channel VARCHAR(64) NOT NULL DEFAULT 'sarafi_hawala' CHECK (settlement_channel IN ('sarafi_hawala', 'bank_transfer', 'cash_courier', 'internal_offset')),
    sarafi_reference_no VARCHAR(128),
    settlement_status VARCHAR(32) NOT NULL DEFAULT 'settled' CHECK (settlement_status IN ('pending', 'settled', 'disputed')),
    settled_by_user_name VARCHAR(128) NOT NULL DEFAULT 'Branch Cashier',
    settled_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. BRANCH REVENUE & PROFITABILITY SNAPSHOTS TABLE
CREATE TABLE IF NOT EXISTS public.branch_revenue_snapshots (
    id VARCHAR(64) PRIMARY KEY,
    branch_id VARCHAR(64) NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    gross_freight_revenue NUMERIC(14, 2) NOT NULL DEFAULT 0.0,
    origin_bookings_revenue NUMERIC(14, 2) NOT NULL DEFAULT 0.0,
    dest_cod_collected NUMERIC(14, 2) NOT NULL DEFAULT 0.0,
    dest_commissions_retained NUMERIC(14, 2) NOT NULL DEFAULT 0.0,
    total_operating_expenses NUMERIC(14, 2) NOT NULL DEFAULT 0.0,
    net_profit NUMERIC(14, 2) NOT NULL DEFAULT 0.0,
    profit_margin_percent NUMERIC(6, 2) NOT NULL DEFAULT 0.0,
    total_dispatched_volume INTEGER NOT NULL DEFAULT 0,
    total_received_volume INTEGER NOT NULL DEFAULT 0,
    settled_remittances_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.0,
    pending_remittances_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. INDEXES FOR HIGH-THROUGHPUT AGGREGATION
CREATE INDEX IF NOT EXISTS idx_settlements_shipment_id ON public.branch_settlements(shipment_id);
CREATE INDEX IF NOT EXISTS idx_settlements_cn ON public.branch_settlements(cn_number);
CREATE INDEX IF NOT EXISTS idx_settlements_origin ON public.branch_settlements(origin_branch_id);
CREATE INDEX IF NOT EXISTS idx_settlements_dest ON public.branch_settlements(destination_branch_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON public.branch_settlements(settlement_status);
CREATE INDEX IF NOT EXISTS idx_revenue_snapshots_branch ON public.branch_revenue_snapshots(branch_id);
CREATE INDEX IF NOT EXISTS idx_revenue_snapshots_period ON public.branch_revenue_snapshots(period_start, period_end);

-- 4. VIEW: REAL-TIME NATIONWIDE REVENUE & P&L OVERVIEW
CREATE OR REPLACE VIEW public.view_revenue_pnl_summary AS
SELECT 
    b.id AS branch_id,
    b.name AS branch_name,
    b.name_fa AS branch_name_fa,
    b.name_ps AS branch_name_ps,
    b.code AS branch_code,
    b.city AS branch_city,
    b.province AS branch_province,
    
    -- Origin Gross Bookings
    COALESCE(SUM(CASE WHEN s.origin_branch_id = b.id THEN (s.financials->>'totalAmount')::numeric ELSE 0 END), 0) AS gross_origin_revenue,
    
    -- Destination COD Collected
    COALESCE(SUM(CASE WHEN s.destination_branch_id = b.id AND (s.financials->>'paymentStatus') = 'to_pay' THEN (s.financials->>'totalAmount')::numeric ELSE 0 END), 0) AS cod_collected_destination,
    
    -- Destination Commissions Retained
    COALESCE(SUM(CASE WHEN s.destination_branch_id = b.id THEN COALESCE(s.dest_branch_commission, 100.0) ELSE 0 END), 0) AS total_dest_commissions,
    
    -- Operating Expenses
    COALESCE((SELECT SUM(be.amount) FROM public.branch_expenses be WHERE be.branch_id = b.id), 0) AS total_expenses,
    
    -- Dispatched & Received Counts
    COUNT(CASE WHEN s.origin_branch_id = b.id THEN 1 END) AS count_dispatched,
    COUNT(CASE WHEN s.destination_branch_id = b.id THEN 1 END) AS count_received

FROM public.branches b
LEFT JOIN public.shipments s ON (s.origin_branch_id = b.id OR s.destination_branch_id = b.id)
GROUP BY b.id, b.name, b.name_fa, b.name_ps, b.code, b.city, b.province;
