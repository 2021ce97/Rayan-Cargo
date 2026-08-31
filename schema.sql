-- ==============================================================================
-- RAYAN CARGO & LOGISTICS AFGHANISTAN
-- SUPABASE POSTGRESQL PRODUCTION MIGRATION & DATABASE SCHEMA
-- File: /schema.sql
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. BRANCHES TABLE (6 Major Afghan Logistics Hubs)
CREATE TABLE IF NOT EXISTS public.branches (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_fa VARCHAR(255),
    name_ps VARCHAR(255),
    code VARCHAR(10) UNIQUE NOT NULL,
    city VARCHAR(100) NOT NULL,
    province VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(50) NOT NULL,
    manager_name VARCHAR(150),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. USERS / STAFF / CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id VARCHAR(64) PRIMARY KEY,
    branch_id VARCHAR(64) REFERENCES public.branches(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'branch_manager', 'operator', 'customer')),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. SHIPMENTS / CONSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS public.shipments (
    id VARCHAR(64) PRIMARY KEY,
    cn_number VARCHAR(50) UNIQUE NOT NULL,
    origin_branch_id VARCHAR(64) NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    destination_branch_id VARCHAR(64) NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    current_branch_id VARCHAR(64) REFERENCES public.branches(id) ON DELETE SET NULL,
    
    -- Sender Details
    sender_name VARCHAR(150) NOT NULL,
    sender_phone VARCHAR(50) NOT NULL,
    sender_city VARCHAR(100) NOT NULL,
    sender_address TEXT,
    sender_national_id VARCHAR(100),
    
    -- Receiver Details
    receiver_name VARCHAR(150) NOT NULL,
    receiver_phone VARCHAR(50) NOT NULL,
    receiver_city VARCHAR(100) NOT NULL,
    receiver_address TEXT,
    
    -- Package Details
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    weight_kg NUMERIC(8, 2) NOT NULL DEFAULT 1.0,
    pieces INTEGER NOT NULL DEFAULT 1,
    service_type VARCHAR(50) NOT NULL DEFAULT 'standard',
    package_description TEXT,
    is_fragile BOOLEAN DEFAULT FALSE NOT NULL,
    
    -- Financials (All in Afghan Afghanis - AFN)
    base_rate NUMERIC(10, 2) NOT NULL DEFAULT 100.0,
    weight_cost NUMERIC(10, 2) NOT NULL DEFAULT 30.0,
    transportation_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    packaging_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    insurance_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 130.0,
    amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    amount_due NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'to_pay', 'pending')),
    
    -- Inter-Branch Financial Settlement & Commission
    dest_branch_commission NUMERIC(10, 2) DEFAULT 100.0,
    origin_remittance_due NUMERIC(10, 2),
    remittance_status VARCHAR(50) DEFAULT 'not_applicable' CHECK (remittance_status IN ('not_applicable', 'pending', 'settled')),
    settled_at TIMESTAMPTZ,
    settlement_note TEXT,
    
    -- Status & Pre-booking Workflow
    status VARCHAR(50) NOT NULL DEFAULT 'booked' CHECK (status IN ('pre_booked', 'booked', 'in_transit', 'received_at_branch', 'out_for_delivery', 'delivered', 'returned', 'cancelled')),
    is_customer_prebooked BOOLEAN DEFAULT FALSE NOT NULL,
    customer_user_id VARCHAR(64) REFERENCES public.users(id) ON DELETE SET NULL,
    
    -- Tracking & Timestamps
    booked_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    estimated_delivery TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. TRACKING EVENTS / AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS public.shipment_tracking_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id VARCHAR(64) NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    location_name VARCHAR(150) NOT NULL,
    location_fa VARCHAR(150),
    description TEXT NOT NULL,
    description_fa TEXT,
    timestamp TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_by_user_id VARCHAR(64) REFERENCES public.users(id) ON DELETE SET NULL
);

-- 6. BRANCH EXPENSES TABLE (Shop Rent, Food, Staff Salaries, Fuel, Maintenance)
CREATE TABLE IF NOT EXISTS public.expenses (
    id VARCHAR(64) PRIMARY KEY,
    branch_id VARCHAR(64) NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('rent', 'salary', 'food', 'utilities', 'transport', 'maintenance', 'other')),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    receipt_number VARCHAR(100),
    notes TEXT,
    created_by_user_id VARCHAR(64) REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. INTER-BRANCH FINANCIAL SETTLEMENTS & SARAFI HAWALA TABLE
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

-- 8. BRANCH REVENUE & PROFITABILITY SNAPSHOTS TABLE
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

-- 9. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_shipments_cn ON public.shipments(cn_number);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON public.shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_origin ON public.shipments(origin_branch_id);
CREATE INDEX IF NOT EXISTS idx_shipments_dest ON public.shipments(destination_branch_id);
CREATE INDEX IF NOT EXISTS idx_shipments_current_branch ON public.shipments(current_branch_id);
CREATE INDEX IF NOT EXISTS idx_shipments_sender_phone ON public.shipments(sender_phone);
CREATE INDEX IF NOT EXISTS idx_shipments_receiver_phone ON public.shipments(receiver_phone);
CREATE INDEX IF NOT EXISTS idx_shipments_customer ON public.shipments(customer_user_id);
CREATE INDEX IF NOT EXISTS idx_tracking_shipment_id ON public.shipment_tracking_events(shipment_id);
CREATE INDEX IF NOT EXISTS idx_expenses_branch_date ON public.expenses(branch_id, date);
CREATE INDEX IF NOT EXISTS idx_settlements_shipment_id ON public.branch_settlements(shipment_id);
CREATE INDEX IF NOT EXISTS idx_settlements_cn ON public.branch_settlements(cn_number);
CREATE INDEX IF NOT EXISTS idx_revenue_snapshots_branch ON public.branch_revenue_snapshots(branch_id);

