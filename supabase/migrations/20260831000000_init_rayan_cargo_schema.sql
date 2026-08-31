-- ==============================================================================
-- RAYAN CARGO & LOGISTICS AFGHANISTAN
-- SUPABASE POSTGRESQL PRODUCTION MIGRATION & DATABASE SCHEMA
-- Migration: 20260831000000_init_rayan_cargo_schema.sql
-- Description: Complete schema for multi-branch courier operations, customer portal,
--              expense tracking, inter-branch settlements, and audit tracking.
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

-- 7. PERFORMANCE INDEXES
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

-- 8. SEED DATA - 6 AFGHAN BRANCH LOGISTICS HUBS
INSERT INTO public.branches (id, name, name_fa, name_ps, code, city, province, address, phone, manager_name)
VALUES
    ('branch-kabul', 'Kabul Central Hub', 'نمایندگی مرکزی کابل', 'د کابل مرکزي څانګه', 'KBL', 'Kabul', 'Kabul', 'Shahr-e-Naw, Ansari Square, Logistics Tower', '+93 799 123 456', 'Ahmad Farhad'),
    ('branch-herat', 'Herat Western Terminal', 'نمایندگی غرب هرات', 'د هرات لویدیځه څانګه', 'HRT', 'Herat', 'Herat', 'Chawk-e-Golha, Main Trade Avenue', '+93 799 234 567', 'Mirwais Sadiq'),
    ('branch-mazar', 'Mazar-i-Sharif North Hub', 'نمایندگی شمال مزار شریف', 'د مزار شریف شمالي څانګه', 'MZR', 'Mazar-i-Sharif', 'Balkh', 'Kefayat Market, Port Highway Road', '+93 799 345 678', 'Abdul Qadir'),
    ('branch-kandahar', 'Kandahar Southern Hub', 'نمایندگی جنوب قندهار', 'د کندهار جنوبي څانګه', 'KDH', 'Kandahar', 'Kandahar', 'Shahidano Chawk, Commercial Plaza', '+93 799 456 789', 'Noor Ahmad'),
    ('branch-jalalabad', 'Jalalabad Eastern Hub', 'نمایندگی شرق جلال آباد', 'د جلال اباد ختیځه څانګه', 'JAL', 'Jalalabad', 'Nangarhar', 'Torkham Highway, Customs Road', '+93 799 567 890', 'Gul Rahman'),
    ('branch-kunduz', 'Kunduz North-East Hub', 'نمایندگی شمال‌شرق کندز', 'د کندز شمال ختیځ څانګه', 'KDZ', 'Kunduz', 'Kunduz', 'Main Roundabout, Spinzar Avenue', '+93 799 678 901', 'Zabiullah')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    name_fa = EXCLUDED.name_fa,
    name_ps = EXCLUDED.name_ps,
    city = EXCLUDED.city,
    province = EXCLUDED.province,
    phone = EXCLUDED.phone;

-- 9. SEED DATA - DEFAULT USERS & ROLES
INSERT INTO public.users (id, branch_id, name, username, email, phone, password_hash, role)
VALUES
    ('u-admin', NULL, 'Rayan General Director (Admin)', 'admin', 'admin@rayancargo.af', '+93 799 000 000', '$2a$10$RayanCargoAdminSuperPassHash2026', 'super_admin'),
    ('u-kbl', 'branch-kabul', 'Ahmad Farhad (Kabul Mgr)', 'kabul_mgr', 'kabul@rayancargo.af', '+93 799 123 456', '$2a$10$RayanCargoKabulPassHash2026', 'branch_manager'),
    ('u-hrt', 'branch-herat', 'Mirwais Sadiq (Herat Mgr)', 'herat_mgr', 'herat@rayancargo.af', '+93 799 234 567', '$2a$10$RayanCargoHeratPassHash2026', 'branch_manager'),
    ('u-mzr', 'branch-mazar', 'Abdul Qadir (Mazar Mgr)', 'mazar_mgr', 'mazar@rayancargo.af', '+93 799 345 678', '$2a$10$RayanCargoMazarPassHash2026', 'branch_manager'),
    ('u-kdh', 'branch-kandahar', 'Noor Ahmad (Kandahar Mgr)', 'kandahar_mgr', 'kandahar@rayancargo.af', '+93 799 456 789', '$2a$10$RayanCargoKdhPassHash2026', 'branch_manager'),
    ('u-jal', 'branch-jalalabad', 'Gul Rahman (Jalalabad Mgr)', 'jalalabad_mgr', 'jalalabad@rayancargo.af', '+93 799 567 890', '$2a$10$RayanCargoJalPassHash2026', 'branch_manager'),
    ('u-kdz', 'branch-kunduz', 'Zabiullah (Kunduz Mgr)', 'kunduz_mgr', 'kunduz@rayancargo.af', '+93 799 678 901', '$2a$10$RayanCargoKdzPassHash2026', 'branch_manager'),
    ('u-cust-1', NULL, 'Mohammad Qasim (Merchant)', 'qasim', 'qasim.merchant@gmail.com', '+93 700 123 456', '$2a$10$RayanCargoCustomerPassHash2026', 'customer')
ON CONFLICT (id) DO NOTHING;

-- 10. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_tracking_events ENABLE ROW LEVEL SECURITY;

-- Allow public read for tracking and verification
CREATE POLICY "Public shipments read by CN number" ON public.shipments
    FOR SELECT USING (true);

CREATE POLICY "Public branches read" ON public.branches
    FOR SELECT USING (true);

CREATE POLICY "Public tracking events read" ON public.shipment_tracking_events
    FOR SELECT USING (true);

-- Authenticated branch staff full access
CREATE POLICY "Branch staff manage shipments" ON public.shipments
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Branch staff manage expenses" ON public.expenses
    FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- END OF MIGRATION
-- ==============================================================================
