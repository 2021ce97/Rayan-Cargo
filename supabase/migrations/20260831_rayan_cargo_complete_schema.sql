-- ==============================================================================
-- RAYAN CARGO DB - COMPREHENSIVE SUPABASE POSTGRESQL MIGRATION SCRIPT
-- ==============================================================================
-- Description: Complete production schema for Rayan Cargo Logistics Network
-- Tables: branches, users, shipments, branch_expenses, inter_branch_settlements
-- Includes: Indexes, RLS Policies, Triggers, Sample Seed Data
-- Target Database: PostgreSQL 15+ / Supabase
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. BRANCHES TABLE (Hubs & Provincial Terminals across Afghanistan)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.branches (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_fa VARCHAR(255),
    name_ps VARCHAR(255),
    code VARCHAR(32) NOT NULL UNIQUE,
    province VARCHAR(128) NOT NULL,
    city VARCHAR(128) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(64) NOT NULL,
    email VARCHAR(128) NOT NULL,
    manager_name VARCHAR(128) NOT NULL,
    is_head_office BOOLEAN DEFAULT FALSE,
    active_shipments_count INT DEFAULT 0,
    total_parcels_dispatched INT DEFAULT 0,
    total_parcels_received INT DEFAULT 0,
    total_revenue_afn NUMERIC(14,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. USERS TABLE (Super Admins, Branch Managers, Customers)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    email VARCHAR(128) UNIQUE,
    phone VARCHAR(64) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('super_admin', 'branch_manager', 'customer')),
    branch_id VARCHAR(64) NOT NULL, -- 'all' for super_admin, customer ID or specific branch
    password VARCHAR(255) NOT NULL,
    password_changed_by_branch BOOLEAN DEFAULT FALSE,
    last_password_change TIMESTAMPTZ,
    status VARCHAR(32) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login VARCHAR(64),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 4. SHIPMENTS TABLE (Consignments, Pre-Bookings, Billing & Inter-Branch Flow)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.shipments (
    id VARCHAR(64) PRIMARY KEY,
    cn_number VARCHAR(64) NOT NULL UNIQUE,
    origin_branch_id VARCHAR(64) NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    destination_branch_id VARCHAR(64) NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    current_branch_id VARCHAR(64) NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    sender JSONB NOT NULL,
    receiver JSONB NOT NULL,
    package_info JSONB NOT NULL,
    financials JSONB NOT NULL,
    status VARCHAR(64) NOT NULL DEFAULT 'booked' 
      CHECK (status IN ('pre_booked', 'booked', 'in_transit', 'received_at_branch', 'out_for_delivery', 'delivered', 'returned', 'cancelled')),
    status_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_customer_prebooked BOOLEAN DEFAULT FALSE,
    customer_user_id VARCHAR(64),
    transportation_fee NUMERIC(12,2) DEFAULT 0,
    dest_branch_commission NUMERIC(12,2) DEFAULT 0,
    origin_remittance_due NUMERIC(12,2) DEFAULT 0,
    remittance_status VARCHAR(32) DEFAULT 'pending' CHECK (remittance_status IN ('pending', 'settled', 'not_applicable')),
    booked_at TIMESTAMPTZ DEFAULT NOW(),
    estimated_delivery TIMESTAMPTZ,
    actual_delivery TIMESTAMPTZ,
    pod_signature TEXT,
    receiver_id_proof TEXT,
    delivery_notes TEXT,
    booked_by_user_id VARCHAR(64),
    booked_by_user_name VARCHAR(128),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 5. BRANCH EXPENSES TABLE (Shop Rent, Employee Salaries, Food, Fuel, etc.)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.branch_expenses (
    id VARCHAR(64) PRIMARY KEY,
    branch_id VARCHAR(64) NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    category VARCHAR(64) NOT NULL 
      CHECK (category IN ('rent', 'salary', 'food', 'fuel_transport', 'utilities', 'maintenance', 'other')),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    paid_to VARCHAR(128),
    receipt_number VARCHAR(64),
    created_by_name VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 6. INTER-BRANCH SETTLEMENTS TABLE (Settlement of COD collections between branches)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.inter_branch_settlements (
    id VARCHAR(64) PRIMARY KEY,
    origin_branch_id VARCHAR(64) NOT NULL REFERENCES public.branches(id),
    destination_branch_id VARCHAR(64) NOT NULL REFERENCES public.branches(id),
    shipment_id VARCHAR(64) NOT NULL REFERENCES public.shipments(id),
    cn_number VARCHAR(64) NOT NULL,
    total_collected_afn NUMERIC(12,2) NOT NULL,
    commission_retained_afn NUMERIC(12,2) NOT NULL,
    remittance_amount_afn NUMERIC(12,2) NOT NULL,
    settlement_status VARCHAR(32) DEFAULT 'pending' CHECK (settlement_status IN ('pending', 'remitted', 'confirmed')),
    settled_at TIMESTAMPTZ,
    settled_by VARCHAR(128),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 7. PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_shipments_cn ON public.shipments(cn_number);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON public.shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_origin ON public.shipments(origin_branch_id);
CREATE INDEX IF NOT EXISTS idx_shipments_destination ON public.shipments(destination_branch_id);
CREATE INDEX IF NOT EXISTS idx_shipments_customer ON public.shipments(customer_user_id);
CREATE INDEX IF NOT EXISTS idx_shipments_created_at ON public.shipments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_branches_code ON public.branches(code);
CREATE INDEX IF NOT EXISTS idx_expenses_branch ON public.branch_expenses(branch_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.branch_expenses(expense_date DESC);

-- ==============================================================================
-- 8. AUTOMATIC UPDATED_AT TRIGGER FUNCTION
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_branches_updated_at ON public.branches;
CREATE TRIGGER set_branches_updated_at
BEFORE UPDATE ON public.branches
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_users_updated_at ON public.users;
CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_shipments_updated_at ON public.shipments;
CREATE TRIGGER set_shipments_updated_at
BEFORE UPDATE ON public.shipments
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 9. SEED DATA (Default Branches & Users for Afghanistan Network)
-- ==============================================================================

-- 9.1 Insert Initial Branches
INSERT INTO public.branches (
    id, name, name_fa, name_ps, code, province, city, address, phone, email,
    manager_name, is_head_office, active_shipments_count, total_parcels_dispatched,
    total_parcels_received, total_revenue_afn
) VALUES 
('br_kbl_01', 'Kabul Central Hub', 'نمایندگی مرکزی کابل', 'د کابل مرکزي څانګه', 'KBL-01', 'Kabul', 'Kabul City (Shahr-e-Naw)', 'Ansari Square, Shahr-e-Naw, Cargo Center #4', '+93 79 123 4567', 'kabul@rayancargo.af', 'Ahmad Rashid Safi', TRUE, 142, 1890, 1420, 984500),
('br_hrt_02', 'Herat Western Terminal', 'نمایندگی ولایت هرات', 'د هرات ولایت څانګه', 'HRT-02', 'Herat', 'Herat City', 'Velayat Road, Near Minarets Cargo Terminal', '+93 70 882 1144', 'herat@rayancargo.af', 'Mohammad Farhad Nazari', FALSE, 88, 920, 850, 485000),
('br_mzr_03', 'Mazar-i-Sharif Northern Hub', 'نمایندگی مزارشریف و بلخ', 'د مزارشریف څانګه (بلخ)', 'MZR-03', 'Balkh', 'Mazar-i-Sharif', 'Kefayat Market Road, Near Rawza Square', '+93 78 554 9900', 'mazar@rayancargo.af', 'Zabihullah Balkhi', FALSE, 64, 780, 710, 395000),
('br_kdh_04', 'Kandahar Southern Terminal', 'نمایندگی ولایت قندهار', 'د کندهار ولایت څانګه', 'KDH-04', 'Kandahar', 'Kandahar City', 'Shahidano Chawk, Commercial Cargo Terminal', '+93 77 441 2233', 'kandahar@rayancargo.af', 'Noor Ahmad Popalzai', FALSE, 52, 640, 620, 340000),
('br_jlb_05', 'Jalalabad Eastern Hub', 'نمایندگی جلال‌آباد ننگرهار', 'د جلال اباد څانګه (ننګرهار)', 'JLB-05', 'Nangarhar', 'Jalalabad City', 'Mukhabirat Chowk, Torkham Transit Way', '+93 74 332 7788', 'jalalabad@rayancargo.af', 'Hikmatullah Shinwari', FALSE, 45, 580, 510, 290000),
('br_knd_06', 'Kunduz North Gateway', 'نمایندگی ولایت کندز', 'د کندز ولایت څانګه', 'KND-06', 'Kunduz', 'Kunduz City', 'Main Bandar Khanabad, Cargo Hub 2', '+93 72 990 1234', 'kunduz@rayancargo.af', 'Sardar Wali Qadiri', FALSE, 28, 310, 290, 175000)
ON CONFLICT (id) DO NOTHING;

-- 9.2 Insert Initial Users (Super Admin, Branch Managers, Sample Customer)
INSERT INTO public.users (
    id, name, email, phone, role, branch_id, password, status
) VALUES 
('usr_admin', 'Eng. Sayed Mustafa Hashemi', 'admin@rayancargo.af', '+93 79 900 1122', 'super_admin', 'all', 'admin123', 'active'),
('usr_kbl_01', 'Ahmad Rashid Safi', 'kabul@rayancargo.af', '+93 79 123 4567', 'branch_manager', 'br_kbl_01', 'kabul123', 'active'),
('usr_hrt_02', 'Mohammad Farhad Nazari', 'herat@rayancargo.af', '+93 70 882 1144', 'branch_manager', 'br_hrt_02', 'herat123', 'active'),
('usr_mzr_03', 'Zabihullah Balkhi', 'mazar@rayancargo.af', '+93 78 554 9900', 'branch_manager', 'br_mzr_03', 'mazar123', 'active'),
('usr_kdh_04', 'Noor Ahmad Popalzai', 'kandahar@rayancargo.af', '+93 77 441 2233', 'branch_manager', 'br_kdh_04', 'kandahar123', 'active'),
('usr_jlb_05', 'Hikmatullah Shinwari', 'jalalabad@rayancargo.af', '+93 74 332 7788', 'branch_manager', 'br_jlb_05', 'jalalabad123', 'active'),
('usr_knd_06', 'Sardar Wali Qadiri', 'kunduz@rayancargo.af', '+93 72 990 1234', 'branch_manager', 'br_knd_06', 'kunduz123', 'active'),
('usr_cust_01', 'Haji Mohammad Ali', 'customer@gmail.com', '+93 79 555 1234', 'customer', 'customer', 'customer123', 'active')
ON CONFLICT (id) DO NOTHING;

-- 9.3 Insert Initial Branch Expenses
INSERT INTO public.branch_expenses (
    id, branch_id, category, amount, description, expense_date, paid_to, receipt_number, created_by_name
) VALUES
('exp_01', 'br_kbl_01', 'rent', 35000, 'Monthly Terminal Warehouse Rent (Month of Hamal)', CURRENT_DATE - INTERVAL '10 days', 'Kabul Plaza Management', 'RC-RENT-401', 'Ahmad Rashid Safi'),
('exp_02', 'br_kbl_01', 'salary', 45000, 'Branch Loading & Dispatch Staff Salary', CURRENT_DATE - INTERVAL '5 days', 'Branch Staff (3 Persons)', 'SAL-KBL-01', 'Ahmad Rashid Safi'),
('exp_03', 'br_kbl_01', 'food', 8500, 'Daily Staff Lunch & Tea Refreshments', CURRENT_DATE - INTERVAL '2 days', 'Madina Restaurant', 'FOOD-102', 'Ahmad Rashid Safi'),
('exp_04', 'br_kbl_01', 'fuel_transport', 16000, 'Cargo Van Diesel & Highway Transit Tolls', CURRENT_DATE - INTERVAL '1 day', 'Kabul-Kandahar Express Fuel', 'FUEL-883', 'Ahmad Rashid Safi'),
('exp_05', 'br_hrt_02', 'rent', 22000, 'Herat Minarets Terminal Rent', CURRENT_DATE - INTERVAL '12 days', 'Herat Real Estate', 'HRT-RENT-02', 'Mohammad Farhad Nazari'),
('exp_06', 'br_hrt_02', 'salary', 32000, 'Herat Branch Warehouse Workers Salary', CURRENT_DATE - INTERVAL '4 days', 'Branch Staff (2 Persons)', 'SAL-HRT-02', 'Mohammad Farhad Nazari'),
('exp_07', 'br_mzr_03', 'rent', 20000, 'Mazar Rawza Commercial Hub Rent', CURRENT_DATE - INTERVAL '8 days', 'Kefayat Market', 'MZR-RENT-03', 'Zabihullah Balkhi')
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 10. HELPER ANALYTICS VIEWS
-- ==============================================================================
CREATE OR REPLACE VIEW public.vw_branch_financial_summary AS
SELECT 
    b.id AS branch_id,
    b.name AS branch_name,
    b.province,
    b.city,
    b.total_revenue_afn AS total_dispatched_revenue,
    COALESCE(SUM(e.amount), 0) AS total_expenses_afn,
    (b.total_revenue_afn - COALESCE(SUM(e.amount), 0)) AS net_profit_afn
FROM public.branches b
LEFT JOIN public.branch_expenses e ON b.id = e.branch_id
GROUP BY b.id, b.name, b.province, b.city, b.total_revenue_afn;

COMMENT ON TABLE public.branches IS 'Rayan Cargo provincial logistics terminals';
COMMENT ON TABLE public.users IS 'Authenticated users (Super Admin, Branch Managers, Customers)';
COMMENT ON TABLE public.shipments IS 'Consignment notes and live tracking milestones with inter-branch remittances';
COMMENT ON TABLE public.branch_expenses IS 'Operating expenses (rent, salary, food, fuel, etc.) for each branch';
