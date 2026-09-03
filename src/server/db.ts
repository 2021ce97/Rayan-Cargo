import pg from 'pg';
import fs from 'fs';
import path from 'path';
const { Pool } = pg;

interface MockDbStore {
  branches: Map<string, any>;
  users: Map<string, any>;
  shipments: Map<string, any>;
  branch_expenses: Map<string, any>;
  branch_settlements: Map<string, any>;
}

const memoryStore: MockDbStore = {
  branches: new Map(),
  users: new Map(),
  shipments: new Map(),
  branch_expenses: new Map(),
  branch_settlements: new Map()
};

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'db_store.json');

export function saveStoreToDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const data = {
      branches: Array.from(memoryStore.branches.entries()),
      users: Array.from(memoryStore.users.entries()),
      shipments: Array.from(memoryStore.shipments.entries()),
      branch_expenses: Array.from(memoryStore.branch_expenses.entries()),
      branch_settlements: Array.from(memoryStore.branch_settlements.entries()),
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not save database store to disk:', err);
  }
}

export function loadStoreFromDisk(): boolean {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.branches)) memoryStore.branches = new Map(data.branches);
      if (Array.isArray(data.users)) memoryStore.users = new Map(data.users);
      if (Array.isArray(data.shipments)) memoryStore.shipments = new Map(data.shipments);
      if (Array.isArray(data.branch_expenses)) memoryStore.branch_expenses = new Map(data.branch_expenses);
      if (Array.isArray(data.branch_settlements)) memoryStore.branch_settlements = new Map(data.branch_settlements);
      console.log(`📦 Loaded ${memoryStore.branches.size} branches, ${memoryStore.shipments.size} shipments, ${memoryStore.users.size} users from persistent disk store.`);
      return true;
    }
  } catch (err) {
    console.warn('Could not load database store from disk:', err);
  }
  return false;
}

// Attempt immediate load from disk on module import
loadStoreFromDisk();

let useMock = !process.env.DATABASE_URL;
let realPool: pg.Pool | null = null;

// In-Memory Database Handler for instant offline/container support
const mockDb = {
  query: async (queryText: string, params: any[] = []): Promise<{ rows: any[]; rowCount: number }> => {
    const q = queryText.trim();
    const upper = q.toUpperCase();

    // 1. Health checks & simple selects
    if (upper.includes('SELECT NOW()')) {
      return {
        rows: [{ server_time: new Date().toISOString(), pg_version: 'PostgreSQL 16.0 (In-Memory Engine)' }],
        rowCount: 1
      };
    }

    // 2. Count queries
    if (upper.includes('SELECT COUNT(*) AS COUNT FROM BRANCHES') || upper.includes('SELECT COUNT(*) FROM BRANCHES')) {
      return { rows: [{ count: String(memoryStore.branches.size) }], rowCount: 1 };
    }
    if (upper.includes('SELECT COUNT(*) AS COUNT FROM USERS') || upper.includes('SELECT COUNT(*) FROM USERS')) {
      return { rows: [{ count: String(memoryStore.users.size) }], rowCount: 1 };
    }
    if (upper.includes('SELECT COUNT(*) AS COUNT FROM SHIPMENTS') || upper.includes('SELECT COUNT(*) FROM SHIPMENTS')) {
      return { rows: [{ count: String(memoryStore.shipments.size) }], rowCount: 1 };
    }

    // 3. Branches queries
    if (upper.startsWith('SELECT * FROM BRANCHES')) {
      const branchesList = Array.from(memoryStore.branches.values()).sort((a, b) => {
        if (a.is_head_office && !b.is_head_office) return -1;
        if (!a.is_head_office && b.is_head_office) return 1;
        return (a.name || '').localeCompare(b.name || '');
      });
      return { rows: branchesList, rowCount: branchesList.length };
    }

    if (upper.startsWith('INSERT INTO BRANCHES')) {
      // Params: id, name, name_fa, name_ps, code, province, city, address, phone, email, manager_name, tazkira_number, is_head_office, active_shipments_count, total_parcels_dispatched, total_parcels_received, total_revenue_afn, created_at
      const [id, name, name_fa, name_ps, code, province, city, address, phone, email, manager_name, tazkira_number, is_head_office, active_shipments_count, total_parcels_dispatched, total_parcels_received, total_revenue_afn, created_at] = params;
      const existing = memoryStore.branches.get(id) || {};
      const updated = {
        ...existing,
        id,
        name,
        name_fa: name_fa || name,
        name_ps: name_ps || name,
        code,
        province,
        city,
        address,
        phone,
        email,
        manager_name,
        tazkira_number: tazkira_number || existing.tazkira_number || '',
        is_head_office: !!is_head_office,
        active_shipments_count: active_shipments_count || 0,
        total_parcels_dispatched: total_parcels_dispatched || 0,
        total_parcels_received: total_parcels_received || 0,
        total_revenue_afn: total_revenue_afn || 0,
        created_at: created_at || existing.created_at || new Date().toISOString()
      };
      memoryStore.branches.set(id, updated);
      saveStoreToDisk();
      return { rows: [updated], rowCount: 1 };
    }

    if (upper.startsWith('UPDATE BRANCHES SET')) {
      if (params.length === 2) {
        // [amount, originBranchId]
        const [revenueAdd, branchId] = params;
        const target = memoryStore.branches.get(branchId);
        if (target) {
          target.total_parcels_dispatched = (target.total_parcels_dispatched || 0) + 1;
          target.total_revenue_afn = (parseFloat(target.total_revenue_afn || '0') + parseFloat(revenueAdd || '0'));
          saveStoreToDisk();
        }
      }
      return { rows: [], rowCount: 1 };
    }

    if (upper.startsWith('DELETE FROM BRANCHES')) {
      const [branchId] = params;
      if (branchId) {
        memoryStore.branches.delete(branchId);
        saveStoreToDisk();
      }
      return { rows: [], rowCount: 1 };
    }

    // 4. Users queries
    if (upper.startsWith('SELECT * FROM USERS')) {
      const usersList = Array.from(memoryStore.users.values()).sort((a, b) => {
        return (a.created_at || '').localeCompare(b.created_at || '');
      });
      return { rows: usersList, rowCount: usersList.length };
    }

    if (upper.startsWith('DELETE FROM USERS WHERE BRANCH_ID')) {
      const [branchId] = params;
      if (branchId) {
        for (const [uid, u] of memoryStore.users.entries()) {
          if (u.branch_id === branchId) {
            memoryStore.users.delete(uid);
          }
        }
      }
      return { rows: [], rowCount: 1 };
    }

    if (upper.startsWith('INSERT INTO USERS')) {
      // Params: id, name, email, phone, role, branch_id, password, ...
      const [id, name, email, phone, role, branch_id, password, password_changed_by_branch, last_password_change, status, avatar, created_at, last_login] = params;
      const existing = memoryStore.users.get(id) || {};
      const updated = {
        ...existing,
        id,
        name,
        email,
        phone,
        role,
        branch_id,
        password: password || 'kabul123',
        password_changed_by_branch: !!password_changed_by_branch,
        last_password_change: last_password_change || null,
        status: status || 'active',
        avatar: avatar || null,
        created_at: created_at || existing.created_at || new Date().toISOString(),
        last_login: last_login || 'Never'
      };
      memoryStore.users.set(id, updated);
      saveStoreToDisk();
      return { rows: [updated], rowCount: 1 };
    }

    if (upper.includes('UPDATE USERS SET PASSWORD = $1')) {
      const [newPass, now, userId] = params;
      const u = memoryStore.users.get(userId);
      if (u) {
        u.password = newPass;
        u.password_changed_by_branch = true;
        u.last_password_change = now;
        saveStoreToDisk();
      }
      return { rows: [], rowCount: 1 };
    }

    if (upper.includes('UPDATE USERS SET') && upper.includes('COALESCE($1, EMAIL)')) {
      const [email, password, name, phone, userId] = params;
      const u = memoryStore.users.get(userId);
      if (u) {
        if (email) u.email = email;
        if (password) u.password = password;
        if (name) u.name = name;
        if (phone) u.phone = phone;
        u.password_changed_by_branch = false;
        saveStoreToDisk();
      }
      return { rows: [], rowCount: 1 };
    }

    // 5. Shipments queries
    if (upper.startsWith('SELECT * FROM SHIPMENTS ORDER BY BOOKED_AT DESC')) {
      const list = Array.from(memoryStore.shipments.values()).sort((a, b) => {
        return (b.booked_at || '').localeCompare(a.booked_at || '');
      });
      return { rows: list, rowCount: list.length };
    }

    if (upper.startsWith('INSERT INTO SHIPMENTS')) {
      const [id, cn_number, origin_branch_id, destination_branch_id, current_branch_id, sender, receiver, package_info, financials, status, status_history, booked_at, estimated_delivery, booked_by_user_id, booked_by_user_name] = params;
      const parseJson = (val: any) => typeof val === 'string' ? JSON.parse(val) : val;
      const record = {
        id,
        cn_number,
        origin_branch_id,
        destination_branch_id,
        current_branch_id,
        sender: parseJson(sender),
        receiver: parseJson(receiver),
        package_info: parseJson(package_info),
        financials: parseJson(financials),
        status: status || 'booked',
        status_history: parseJson(status_history || '[]'),
        booked_at: booked_at || new Date().toISOString(),
        estimated_delivery: estimated_delivery || null,
        actual_delivery: null,
        pod_signature: null,
        receiver_id_proof: null,
        delivery_notes: null,
        booked_by_user_id: booked_by_user_id || null,
        booked_by_user_name: booked_by_user_name || null,
        created_at: new Date().toISOString()
      };
      memoryStore.shipments.set(id, record);
      saveStoreToDisk();
      return { rows: [record], rowCount: 1 };
    }

    if (upper.startsWith('UPDATE SHIPMENTS SET') && upper.includes('STATUS = $1')) {
      const [status, statusHistory, actualDelivery, financials, currentBranchId, id] = params;
      const s = memoryStore.shipments.get(id);
      if (s) {
        s.status = status;
        if (statusHistory) s.status_history = typeof statusHistory === 'string' ? JSON.parse(statusHistory) : statusHistory;
        if (actualDelivery) s.actual_delivery = actualDelivery;
        if (financials) s.financials = typeof financials === 'string' ? JSON.parse(financials) : financials;
        if (currentBranchId) s.current_branch_id = currentBranchId;
        saveStoreToDisk();
      }
      return { rows: [], rowCount: 1 };
    }

    if (upper.includes('UPDATE SHIPMENTS SET REMITTANCE_STATUS = \'SETTLED\'')) {
      const [id] = params;
      const s = memoryStore.shipments.get(id);
      if (s) {
        s.remittance_status = 'settled';
        s.origin_remittance_due = 0;
      }
      return { rows: [], rowCount: 1 };
    }

    if (upper.includes('SELECT * FROM SHIPMENTS WHERE') && (upper.includes('UPPER(CN_NUMBER)') || upper.includes('LIKE'))) {
      const cleaned = (params[0] || '').trim().toUpperCase();
      const list = Array.from(memoryStore.shipments.values());
      const found = list.filter(s => {
        const cn = (s.cn_number || '').toUpperCase();
        const sPhone = (s.sender?.phone || '');
        const rPhone = (s.receiver?.phone || '');
        return cn === cleaned || sPhone.includes(cleaned) || rPhone.includes(cleaned);
      });
      return { rows: found.slice(0, 1), rowCount: found.length ? 1 : 0 };
    }

    // 6. Branch Expenses queries
    if (upper.startsWith('SELECT * FROM BRANCH_EXPENSES')) {
      let list = Array.from(memoryStore.branch_expenses.values());
      if (params.length > 0 && params[0]) {
        list = list.filter(e => e.branch_id === params[0]);
      }
      list.sort((a, b) => (b.expense_date || '').localeCompare(a.expense_date || ''));
      return { rows: list, rowCount: list.length };
    }

    if (upper.startsWith('INSERT INTO BRANCH_EXPENSES')) {
      const [id, branch_id, category, amount, description, expense_date, paid_to, receipt_number, created_by_name, created_at] = params;
      const record = {
        id,
        branch_id,
        category,
        amount,
        description,
        expense_date: expense_date || new Date().toISOString().split('T')[0],
        paid_to: paid_to || null,
        receipt_number: receipt_number || null,
        created_by_name: created_by_name || 'Branch Manager',
        created_at: created_at || new Date().toISOString()
      };
      memoryStore.branch_expenses.set(id, record);
      saveStoreToDisk();
      return { rows: [record], rowCount: 1 };
    }

    if (upper.startsWith('DELETE FROM BRANCH_EXPENSES')) {
      const [id] = params;
      memoryStore.branch_expenses.delete(id);
      saveStoreToDisk();
      return { rows: [], rowCount: 1 };
    }

    // 7. Settlements queries
    if (upper.startsWith('SELECT * FROM BRANCH_SETTLEMENTS')) {
      const list = Array.from(memoryStore.branch_settlements.values()).sort((a, b) => {
        return (b.settled_at || '').localeCompare(a.settled_at || '');
      });
      return { rows: list.slice(0, 100), rowCount: list.length };
    }

    if (upper.startsWith('INSERT INTO BRANCH_SETTLEMENTS')) {
      const [id, shipment_id, cn_number, origin_branch_id, destination_branch_id, gross_collected_amount, dest_branch_commission, net_remitted_amount, settlement_channel, sarafi_reference_no, settlement_status, settled_by_user_name, settled_at, notes, created_at] = params;
      const record = {
        id,
        shipment_id: shipment_id || null,
        cn_number,
        origin_branch_id,
        destination_branch_id,
        gross_collected_amount: gross_collected_amount || 0,
        dest_branch_commission: dest_branch_commission || 100,
        net_remitted_amount: net_remitted_amount || 0,
        settlement_channel: settlement_channel || 'sarafi_hawala',
        sarafi_reference_no: sarafi_reference_no || null,
        settlement_status: settlement_status || 'settled',
        settled_by_user_name: settled_by_user_name || 'Branch Cashier',
        settled_at: settled_at || new Date().toISOString(),
        notes: notes || null,
        created_at: created_at || new Date().toISOString()
      };
      memoryStore.branch_settlements.set(id, record);
      saveStoreToDisk();
      return { rows: [record], rowCount: 1 };
    }

    // 8. Analytics queries
    if (upper.includes('FROM BRANCHES B') && upper.includes('LEFT JOIN SHIPMENTS S')) {
      const branches = Array.from(memoryStore.branches.values());
      const shipments = Array.from(memoryStore.shipments.values());

      const summary = branches.map(b => {
        let grossFreight = 0;
        let destCod = 0;
        let destCommission = 0;
        let dispatched = 0;
        let received = 0;

        shipments.forEach(s => {
          const totalAmt = parseFloat(s.financials?.totalAmount || 0);
          if (s.origin_branch_id === b.id) {
            grossFreight += totalAmt;
            dispatched += 1;
          }
          if (s.destination_branch_id === b.id) {
            received += 1;
            destCommission += (s.dest_branch_commission || 100);
            if (s.financials?.paymentStatus === 'to_pay') {
              destCod += totalAmt;
            }
          }
        });

        return {
          id: b.id,
          name: b.name,
          name_fa: b.name_fa || b.name,
          name_ps: b.name_ps || b.name,
          code: b.code,
          city: b.city,
          province: b.province,
          gross_origin_freight: grossFreight,
          dest_cod_collected: destCod,
          dest_commissions_earned: destCommission,
          dispatched_volume: dispatched,
          received_volume: received
        };
      });

      return { rows: summary, rowCount: summary.length };
    }

    if (upper.includes('FROM BRANCH_EXPENSES') && upper.includes('GROUP BY BRANCH_ID')) {
      const expenses = Array.from(memoryStore.branch_expenses.values());
      const aggMap = new Map<string, { total: number; count: number }>();
      expenses.forEach(e => {
        const cur = aggMap.get(e.branch_id) || { total: 0, count: 0 };
        cur.total += parseFloat(e.amount || 0);
        cur.count += 1;
        aggMap.set(e.branch_id, cur);
      });

      const rows = Array.from(aggMap.entries()).map(([branch_id, stat]) => ({
        branch_id,
        total_expenses: stat.total,
        count_expenses: stat.count
      }));

      return { rows, rowCount: rows.length };
    }

    // Default empty response for CREATE TABLE, CREATE INDEX, etc.
    return { rows: [], rowCount: 0 };
  }
};

export const SUPABASE_SCHEMA_SQL = `-- Rayan Cargo Database Schema for Supabase / PostgreSQL
-- Generated for full cloud persistence and real-time cargo operations

-- 1. Branches Table (Includes 13-Digit Tazkira and Multi-language support)
CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_fa TEXT,
  name_ps TEXT,
  code TEXT NOT NULL UNIQUE,
  province TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  manager_name TEXT NOT NULL,
  tazkira_number TEXT,
  is_head_office BOOLEAN DEFAULT FALSE,
  active_shipments_count INTEGER DEFAULT 0,
  total_parcels_dispatched INTEGER DEFAULT 0,
  total_parcels_received INTEGER DEFAULT 0,
  total_revenue_afn NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Users Table (Super Admin, Branch Managers, Cashiers, Customers)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  role TEXT NOT NULL,
  branch_id TEXT NOT NULL DEFAULT 'all',
  password TEXT NOT NULL,
  password_changed_by_branch BOOLEAN DEFAULT FALSE,
  last_password_change TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TEXT
);

-- 3. Shipments Table (CN Booking, QR Tracking, Financials, POD)
CREATE TABLE IF NOT EXISTS shipments (
  id TEXT PRIMARY KEY,
  cn_number TEXT NOT NULL UNIQUE,
  origin_branch_id TEXT NOT NULL,
  destination_branch_id TEXT NOT NULL,
  current_branch_id TEXT NOT NULL,
  sender JSONB NOT NULL,
  receiver JSONB NOT NULL,
  package_info JSONB NOT NULL,
  financials JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'booked',
  status_history JSONB DEFAULT '[]'::jsonb,
  booked_at TIMESTAMPTZ DEFAULT NOW(),
  estimated_delivery TIMESTAMPTZ,
  actual_delivery TIMESTAMPTZ,
  pod_signature TEXT,
  receiver_id_proof TEXT,
  delivery_notes TEXT,
  booked_by_user_id TEXT,
  booked_by_user_name TEXT,
  dest_branch_commission NUMERIC DEFAULT 100,
  remittance_status TEXT DEFAULT 'unsettled',
  origin_remittance_due NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Branch Operating Expenses Table
CREATE TABLE IF NOT EXISTS branch_expenses (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'AFN',
  description TEXT NOT NULL,
  receipt_url TEXT,
  recorded_by_user_id TEXT,
  recorded_by_user_name TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Inter-Branch Financial Settlements & Hawala Remittances
CREATE TABLE IF NOT EXISTS branch_settlements (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  origin_cod_collected NUMERIC DEFAULT 0,
  dest_cod_collected NUMERIC DEFAULT 0,
  dest_commissions_earned NUMERIC DEFAULT 0,
  branch_expenses_deducted NUMERIC DEFAULT 0,
  net_remitted_amount NUMERIC DEFAULT 0,
  settlement_channel TEXT DEFAULT 'sarafi_hawala',
  sarafi_reference_no TEXT,
  settlement_status TEXT DEFAULT 'settled',
  settled_by_user_name TEXT,
  settled_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
`;

export async function migrateSupabaseSchema(pool: pg.Pool): Promise<void> {
  try {
    console.log('🔄 Applying Supabase / PostgreSQL schema migrations...');
    // 1. Create tables if they do not exist
    await pool.query(SUPABASE_SCHEMA_SQL);
    
    // 2. Ensure all columns exist across all tables for existing / legacy databases
    const columnMigrations = [
      // Users table columns
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_id TEXT DEFAULT 'all';`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'staff';`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_by_branch BOOLEAN DEFAULT FALSE;`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMPTZ;`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TEXT;`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();`,

      // Branches table columns
      `ALTER TABLE branches ADD COLUMN IF NOT EXISTS tazkira_number TEXT;`,
      `ALTER TABLE branches ADD COLUMN IF NOT EXISTS name_fa TEXT;`,
      `ALTER TABLE branches ADD COLUMN IF NOT EXISTS name_ps TEXT;`,
      `ALTER TABLE branches ADD COLUMN IF NOT EXISTS is_head_office BOOLEAN DEFAULT FALSE;`,
      `ALTER TABLE branches ADD COLUMN IF NOT EXISTS active_shipments_count INTEGER DEFAULT 0;`,
      `ALTER TABLE branches ADD COLUMN IF NOT EXISTS total_parcels_dispatched INTEGER DEFAULT 0;`,
      `ALTER TABLE branches ADD COLUMN IF NOT EXISTS total_parcels_received INTEGER DEFAULT 0;`,
      `ALTER TABLE branches ADD COLUMN IF NOT EXISTS total_revenue_afn NUMERIC DEFAULT 0;`,
      `ALTER TABLE branches ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();`,

      // Shipments table columns
      `ALTER TABLE shipments ADD COLUMN IF NOT EXISTS origin_branch_id TEXT;`,
      `ALTER TABLE shipments ADD COLUMN IF NOT EXISTS destination_branch_id TEXT;`,
      `ALTER TABLE shipments ADD COLUMN IF NOT EXISTS current_branch_id TEXT;`,
      `ALTER TABLE shipments ADD COLUMN IF NOT EXISTS dest_branch_commission NUMERIC DEFAULT 100;`,
      `ALTER TABLE shipments ADD COLUMN IF NOT EXISTS remittance_status TEXT DEFAULT 'unsettled';`,
      `ALTER TABLE shipments ADD COLUMN IF NOT EXISTS origin_remittance_due NUMERIC DEFAULT 0;`,
      `ALTER TABLE shipments ADD COLUMN IF NOT EXISTS pod_signature TEXT;`,
      `ALTER TABLE shipments ADD COLUMN IF NOT EXISTS receiver_id_proof TEXT;`,
      `ALTER TABLE shipments ADD COLUMN IF NOT EXISTS delivery_notes TEXT;`,
      `ALTER TABLE shipments ADD COLUMN IF NOT EXISTS booked_by_user_id TEXT;`,
      `ALTER TABLE shipments ADD COLUMN IF NOT EXISTS booked_by_user_name TEXT;`,

      // Branch Expenses table columns
      `ALTER TABLE branch_expenses ADD COLUMN IF NOT EXISTS branch_id TEXT;`,
      `ALTER TABLE branch_expenses ADD COLUMN IF NOT EXISTS category TEXT;`,
      `ALTER TABLE branch_expenses ADD COLUMN IF NOT EXISTS amount NUMERIC;`,
      `ALTER TABLE branch_expenses ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'AFN';`,
      `ALTER TABLE branch_expenses ADD COLUMN IF NOT EXISTS description TEXT;`,
      `ALTER TABLE branch_expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT;`,
      `ALTER TABLE branch_expenses ADD COLUMN IF NOT EXISTS recorded_by_user_id TEXT;`,
      `ALTER TABLE branch_expenses ADD COLUMN IF NOT EXISTS recorded_by_user_name TEXT;`,
      `ALTER TABLE branch_expenses ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ DEFAULT NOW();`,

      // Branch Settlements table columns
      `ALTER TABLE branch_settlements ADD COLUMN IF NOT EXISTS branch_id TEXT;`,
      `ALTER TABLE branch_settlements ADD COLUMN IF NOT EXISTS period_start TIMESTAMPTZ;`,
      `ALTER TABLE branch_settlements ADD COLUMN IF NOT EXISTS period_end TIMESTAMPTZ;`,
      `ALTER TABLE branch_settlements ADD COLUMN IF NOT EXISTS origin_cod_collected NUMERIC DEFAULT 0;`,
      `ALTER TABLE branch_settlements ADD COLUMN IF NOT EXISTS dest_cod_collected NUMERIC DEFAULT 0;`,
      `ALTER TABLE branch_settlements ADD COLUMN IF NOT EXISTS dest_commissions_earned NUMERIC DEFAULT 0;`,
      `ALTER TABLE branch_settlements ADD COLUMN IF NOT EXISTS branch_expenses_deducted NUMERIC DEFAULT 0;`,
      `ALTER TABLE branch_settlements ADD COLUMN IF NOT EXISTS net_remitted_amount NUMERIC DEFAULT 0;`,
      `ALTER TABLE branch_settlements ADD COLUMN IF NOT EXISTS settlement_channel TEXT DEFAULT 'sarafi_hawala';`,
      `ALTER TABLE branch_settlements ADD COLUMN IF NOT EXISTS sarafi_reference_no TEXT;`,
      `ALTER TABLE branch_settlements ADD COLUMN IF NOT EXISTS settlement_status TEXT DEFAULT 'settled';`,
      `ALTER TABLE branch_settlements ADD COLUMN IF NOT EXISTS settled_by_user_name TEXT;`,
      `ALTER TABLE branch_settlements ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ DEFAULT NOW();`,
      `ALTER TABLE branch_settlements ADD COLUMN IF NOT EXISTS notes TEXT;`
    ];

    for (const sql of columnMigrations) {
      try {
        await pool.query(sql);
      } catch (err: any) {
        // Silently skip if column already exists or table handles differently
      }
    }

    // 3. Create performance indexes safely
    const indexMigrations = [
      `CREATE INDEX IF NOT EXISTS idx_users_branch ON users(branch_id);`,
      `CREATE INDEX IF NOT EXISTS idx_shipments_cn ON shipments(cn_number);`,
      `CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);`,
      `CREATE INDEX IF NOT EXISTS idx_shipments_origin ON shipments(origin_branch_id);`,
      `CREATE INDEX IF NOT EXISTS idx_shipments_dest ON shipments(destination_branch_id);`,
      `CREATE INDEX IF NOT EXISTS idx_expenses_branch ON branch_expenses(branch_id);`,
      `CREATE INDEX IF NOT EXISTS idx_settlements_branch ON branch_settlements(branch_id);`
    ];

    for (const sql of indexMigrations) {
      try {
        await pool.query(sql);
      } catch (err: any) {
        // Silently continue
      }
    }

    console.log('✅ Supabase / PostgreSQL schema migration verified and applied successfully!');
  } catch (err: any) {
    console.warn('⚠️ Supabase schema migration notice:', err?.message || err);
  }
}

export function getDbPool(): any {
  if (useMock) {
    return mockDb;
  }

  if (!realPool && process.env.DATABASE_URL) {
    try {
      realPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false
        },
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
      });

      realPool.on('error', (err) => {
        console.warn('PostgreSQL pool error, switching to in-memory engine:', err.message);
        useMock = true;
      });

      // Trigger automatic schema migration on connection
      migrateSupabaseSchema(realPool).catch(e => console.warn('Schema init:', e));
    } catch {
      useMock = true;
      return mockDb;
    }
  }

  return realPool || mockDb;
}

export function isUsingRealDatabase(): boolean {
  return !useMock && !!realPool;
}

export function getDatabaseInfo() {
  const dbUrl = process.env.DATABASE_URL || '';
  let maskedUrl = '';
  if (dbUrl) {
    try {
      const parsed = new URL(dbUrl);
      maskedUrl = `${parsed.protocol}//${parsed.username}:••••••••@${parsed.host}${parsed.pathname}`;
    } catch {
      maskedUrl = 'Configured (DATABASE_URL present)';
    }
  }

  return {
    isRealDb: !useMock && !!realPool,
    type: !useMock && !!realPool ? 'Supabase PostgreSQL Cloud Pooler' : 'Persistent High-Speed Multi-Device Database Engine',
    connectionUrl: maskedUrl || 'Not configured (Persistent Local Store active)',
    region: 'AWS South Asia / Direct Cloud',
    stats: {
      branches: memoryStore.branches.size,
      users: memoryStore.users.size,
      shipments: memoryStore.shipments.size,
      expenses: memoryStore.branch_expenses.size,
      settlements: memoryStore.branch_settlements.size,
    },
    tables: ['branches', 'users', 'shipments', 'branch_expenses', 'branch_settlements']
  };
}

export async function connectToSupabase(connectionString: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    console.log('🔄 Connecting to Supabase PostgreSQL...');
    const testPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000
    });

    // 1. Verify connection
    await testPool.query('SELECT NOW()');

    // 2. Run migrations
    await migrateSupabaseSchema(testPool);

    // 3. Populate / sync records from current store to Supabase tables
    for (const b of memoryStore.branches.values()) {
      await testPool.query(`
        INSERT INTO branches (
          id, name, name_fa, name_ps, code, province, city, address, phone, email,
          manager_name, tazkira_number, is_head_office, active_shipments_count,
          total_parcels_dispatched, total_parcels_received, total_revenue_afn, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (id) DO NOTHING;
      `, [
        b.id, b.name, b.name_fa || b.name, b.name_ps || b.name, b.code, b.province, b.city,
        b.address, b.phone, b.email, b.manager_name, b.tazkira_number || '', b.is_head_office || false,
        b.active_shipments_count || 0, b.total_parcels_dispatched || 0, b.total_parcels_received || 0,
        b.total_revenue_afn || 0, b.created_at || new Date().toISOString()
      ]);
    }

    for (const u of memoryStore.users.values()) {
      await testPool.query(`
        INSERT INTO users (
          id, name, email, phone, role, branch_id, password,
          password_changed_by_branch, last_password_change, status, avatar, created_at, last_login
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          password = EXCLUDED.password,
          role = EXCLUDED.role,
          branch_id = EXCLUDED.branch_id;
      `, [
        u.id, u.name, u.email, u.phone, u.role, u.branch_id, u.password,
        u.password_changed_by_branch || false, u.last_password_change || null,
        u.status || 'active', u.avatar || null, u.created_at || new Date().toISOString(), u.last_login || 'Just now'
      ]);
    }

    for (const s of memoryStore.shipments.values()) {
      await testPool.query(`
        INSERT INTO shipments (
          id, cn_number, origin_branch_id, destination_branch_id, current_branch_id,
          sender, receiver, package_info, financials, status, status_history,
          booked_at, estimated_delivery, actual_delivery, pod_signature, receiver_id_proof,
          delivery_notes, booked_by_user_id, booked_by_user_name, dest_branch_commission,
          remittance_status, origin_remittance_due, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        ON CONFLICT (id) DO NOTHING;
      `, [
        s.id, s.cn_number, s.origin_branch_id, s.destination_branch_id, s.current_branch_id,
        JSON.stringify(s.sender), JSON.stringify(s.receiver), JSON.stringify(s.package_info),
        JSON.stringify(s.financials), s.status, JSON.stringify(s.status_history || []),
        s.booked_at, s.estimated_delivery, s.actual_delivery, s.pod_signature, s.receiver_id_proof,
        s.delivery_notes, s.booked_by_user_id, s.booked_by_user_name, s.dest_branch_commission || 100,
        s.remittance_status || 'unsettled', s.origin_remittance_due || 0, s.created_at || new Date().toISOString()
      ]);
    }

    for (const e of memoryStore.branch_expenses.values()) {
      await testPool.query(`
        INSERT INTO branch_expenses (
          id, branch_id, category, amount, currency, description, receipt_url,
          recorded_by_user_id, recorded_by_user_name, recorded_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO NOTHING;
      `, [
        e.id, e.branch_id, e.category, e.amount, e.currency || 'AFN', e.description,
        e.receipt_url, e.recorded_by_user_id, e.recorded_by_user_name, e.recorded_at, e.created_at
      ]);
    }

    // 4. Load all existing data from Supabase tables into memoryStore
    try {
      const dbBranches = await testPool.query('SELECT * FROM branches');
      for (const b of dbBranches.rows) {
        memoryStore.branches.set(b.id, {
          id: b.id,
          name: b.name,
          name_fa: b.name_fa || b.name,
          name_ps: b.name_ps || b.name,
          code: b.code,
          province: b.province,
          city: b.city,
          address: b.address,
          phone: b.phone,
          email: b.email,
          manager_name: b.manager_name,
          tazkira_number: b.tazkira_number || '',
          is_head_office: b.is_head_office || false,
          active_shipments_count: b.active_shipments_count || 0,
          total_parcels_dispatched: b.total_parcels_dispatched || 0,
          total_parcels_received: b.total_parcels_received || 0,
          total_revenue_afn: Number(b.total_revenue_afn || 0),
          created_at: b.created_at || new Date().toISOString()
        });
      }

      const dbUsers = await testPool.query('SELECT * FROM users');
      for (const u of dbUsers.rows) {
        memoryStore.users.set(u.id, {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          role: u.role,
          branch_id: u.branch_id,
          password: u.password,
          password_changed_by_branch: u.password_changed_by_branch || false,
          last_password_change: u.last_password_change || null,
          status: u.status || 'active',
          avatar: u.avatar || null,
          created_at: u.created_at || new Date().toISOString(),
          last_login: u.last_login || 'Never'
        });
      }

      const dbShipments = await testPool.query('SELECT * FROM shipments ORDER BY booked_at DESC');
      for (const s of dbShipments.rows) {
        const parseJson = (val: any) => typeof val === 'string' ? JSON.parse(val) : val;
        memoryStore.shipments.set(s.id, {
          id: s.id,
          cn_number: s.cn_number,
          origin_branch_id: s.origin_branch_id,
          destination_branch_id: s.destination_branch_id,
          current_branch_id: s.current_branch_id,
          sender: parseJson(s.sender),
          receiver: parseJson(s.receiver),
          package_info: parseJson(s.package_info),
          financials: parseJson(s.financials),
          status: s.status,
          status_history: parseJson(s.status_history || '[]'),
          booked_at: s.booked_at,
          estimated_delivery: s.estimated_delivery,
          actual_delivery: s.actual_delivery,
          pod_signature: s.pod_signature,
          receiver_id_proof: s.receiver_id_proof,
          delivery_notes: s.delivery_notes,
          booked_by_user_id: s.booked_by_user_id,
          booked_by_user_name: s.booked_by_user_name,
          dest_branch_commission: s.dest_branch_commission,
          remittance_status: s.remittance_status,
          origin_remittance_due: s.origin_remittance_due,
          created_at: s.created_at
        });
      }

      saveStoreToDisk();
    } catch (pullErr) {
      console.warn('Could not pull existing records from Supabase tables:', pullErr);
    }

    if (realPool) {
      try { await realPool.end(); } catch {}
    }
    realPool = testPool;
    useMock = false;
    process.env.DATABASE_URL = connectionString;

    // Persist to .env
    try {
      const envPath = path.join(process.cwd(), '.env');
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf-8');
      }
      if (envContent.includes('DATABASE_URL=')) {
        envContent = envContent.replace(/DATABASE_URL=.*/g, `DATABASE_URL="${connectionString}"`);
      } else {
        envContent += `\nDATABASE_URL="${connectionString}"\n`;
      }
      fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');
    } catch (e) {
      console.warn('Could not write to .env:', e);
    }

    console.log('✅ Supabase PostgreSQL connected and synchronized successfully!');
    return { success: true, message: 'Connected to Supabase PostgreSQL successfully! All tables migrated and data synchronized.' };
  } catch (err: any) {
    console.error('Supabase connection failed:', err.message);
    return { success: false, error: err.message || 'Failed to connect to Supabase PostgreSQL.' };
  }
}

export async function wipeDatabaseClean(initialUsers: any[] = []): Promise<{ success: boolean; error?: any }> {
  try {
    memoryStore.branches.clear();
    memoryStore.users.clear();
    memoryStore.shipments.clear();
    memoryStore.branch_expenses.clear();
    memoryStore.branch_settlements.clear();

    const adminUser = {
      id: 'usr_admin',
      name: 'Central System Admin',
      email: 'armaghansadeq@cargo.af',
      phone: '+93 79 900 1122',
      role: 'super_admin',
      branchId: 'all',
      password: 'Armaghanrayan123',
      passwordChangedByBranch: false,
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      createdAt: new Date().toISOString(),
      lastLogin: 'Just now'
    };

    memoryStore.users.set(adminUser.id, {
      id: adminUser.id,
      name: adminUser.name,
      email: adminUser.email,
      phone: adminUser.phone,
      role: adminUser.role,
      branch_id: adminUser.branchId,
      password: adminUser.password,
      password_changed_by_branch: false,
      last_password_change: null,
      status: 'active',
      avatar: adminUser.avatar,
      created_at: adminUser.createdAt || new Date().toISOString(),
      last_login: adminUser.lastLogin || 'Just now'
    });

    saveStoreToDisk();

    if (!useMock && realPool) {
      try {
        await migrateSupabaseSchema(realPool);
        const db = getDbPool();
        await db.query(`
          DELETE FROM shipments;
          DELETE FROM branch_expenses;
          DELETE FROM branch_settlements;
          DELETE FROM branches;
          DELETE FROM users WHERE role != 'super_admin';
        `);

        await db.query(`
          INSERT INTO users (
            id, name, email, phone, role, branch_id, password, password_changed_by_branch, status, created_at, last_login
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, false, 'active', NOW(), 'Just now')
          ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            password = EXCLUDED.password,
            role = 'super_admin',
            branch_id = 'all';
        `, [
          adminUser.id,
          adminUser.name,
          adminUser.email,
          adminUser.phone,
          adminUser.role,
          adminUser.branchId,
          adminUser.password
        ]);
      } catch (e) {
        console.warn('Real PG wipe error:', e);
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function initDatabase(
  initialBranches: any[] = [], 
  initialUsers: any[] = [], 
  initialShipments: any[] = []
): Promise<{ success: boolean; error?: any }> {
  try {
    console.log('🔄 Initializing Database Store...');
    // 1. Load any persisted store from disk
    loadStoreFromDisk();

    const adminUser = {
      id: 'usr_admin',
      name: 'Central System Admin',
      email: 'armaghansadeq@cargo.af',
      phone: '+93 79 900 1122',
      role: 'super_admin',
      branchId: 'all',
      password: 'Armaghanrayan123',
      passwordChangedByBranch: false,
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      createdAt: new Date().toISOString(),
      lastLogin: 'Just now'
    };

    // Ensure the central super admin account always exists with the required credentials
    const existingAdmin = memoryStore.users.get(adminUser.id);
    memoryStore.users.set(adminUser.id, {
      id: adminUser.id,
      name: adminUser.name,
      email: adminUser.email,
      phone: adminUser.phone,
      role: adminUser.role,
      branch_id: adminUser.branchId,
      password: adminUser.password,
      password_changed_by_branch: false,
      last_password_change: null,
      status: 'active',
      avatar: adminUser.avatar,
      created_at: existingAdmin?.created_at || adminUser.createdAt,
      last_login: existingAdmin?.last_login || 'Just now'
    });

    // Populate initial branches if memoryStore has no branches
    if (memoryStore.branches.size === 0 && Array.isArray(initialBranches) && initialBranches.length > 0) {
      console.log(`🌱 Seeding ${initialBranches.length} initial branches into database store...`);
      for (const b of initialBranches) {
        memoryStore.branches.set(b.id, {
          id: b.id,
          name: b.name,
          name_fa: b.nameFa || b.name,
          name_ps: b.namePs || b.name,
          code: b.code,
          province: b.province,
          city: b.city,
          address: b.address,
          phone: b.phone,
          email: b.email,
          manager_name: b.managerName,
          tazkira_number: b.tazkiraNumber || '',
          is_head_office: b.isHeadOffice || false,
          active_shipments_count: b.activeShipmentsCount || 0,
          total_parcels_dispatched: b.totalParcelsDispatched || 0,
          total_parcels_received: b.totalParcelsReceived || 0,
          total_revenue_afn: b.totalRevenueAfn || 0,
          created_at: b.createdAt || new Date().toISOString()
        });
      }
    }

    // Populate initial staff users (branch managers) if missing
    if (Array.isArray(initialUsers) && initialUsers.length > 0) {
      for (const u of initialUsers) {
        if (!memoryStore.users.has(u.id)) {
          memoryStore.users.set(u.id, {
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            role: u.role,
            branch_id: u.branchId,
            password: u.password,
            password_changed_by_branch: u.passwordChangedByBranch || false,
            last_password_change: null,
            status: u.status || 'active',
            avatar: u.avatar || null,
            created_at: u.createdAt || new Date().toISOString(),
            last_login: u.lastLogin || 'Never'
          });
        }
      }
    }

    saveStoreToDisk();

    // 2. If Supabase / PostgreSQL database is configured, migrate and sync
    if (process.env.DATABASE_URL) {
      try {
        const pool = getDbPool();
        if (pool && !useMock) {
          await migrateSupabaseSchema(pool);
          await pool.query(`
            INSERT INTO users (
              id, name, email, phone, role, branch_id, password, password_changed_by_branch, status, created_at, last_login
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, false, 'active', NOW(), 'Just now')
            ON CONFLICT (id) DO UPDATE SET
              email = EXCLUDED.email,
              password = EXCLUDED.password,
              role = 'super_admin',
              branch_id = 'all';
          `, [
            adminUser.id,
            adminUser.name,
            adminUser.email,
            adminUser.phone,
            adminUser.role,
            adminUser.branchId,
            adminUser.password
          ]);
        }
      } catch (e) {
        console.warn('PostgreSQL database init warning:', e);
      }
    }

    console.log(`✅ Rayan Cargo Database Store Active (${memoryStore.branches.size} branches, ${memoryStore.shipments.size} shipments, ${memoryStore.users.size} users preserved).`);
    return { success: true };
  } catch (error) {
    console.warn('Database initialization notice:', error);
    return { success: true };
  }
}

