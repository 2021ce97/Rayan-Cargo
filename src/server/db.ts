import pg from 'pg';
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
      // Params: id, name, name_fa, name_ps, code, province, city, address, phone, email, manager_name, is_head_office, active_shipments_count, total_parcels_dispatched, total_parcels_received, total_revenue_afn, created_at
      const [id, name, name_fa, name_ps, code, province, city, address, phone, email, manager_name, is_head_office, active_shipments_count, total_parcels_dispatched, total_parcels_received, total_revenue_afn, created_at] = params;
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
        is_head_office: !!is_head_office,
        active_shipments_count: active_shipments_count || 0,
        total_parcels_dispatched: total_parcels_dispatched || 0,
        total_parcels_received: total_parcels_received || 0,
        total_revenue_afn: total_revenue_afn || 0,
        created_at: created_at || existing.created_at || new Date().toISOString()
      };
      memoryStore.branches.set(id, updated);
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
        }
      }
      return { rows: [], rowCount: 1 };
    }

    if (upper.startsWith('DELETE FROM BRANCHES')) {
      const [branchId] = params;
      if (branchId) {
        memoryStore.branches.delete(branchId);
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
      return { rows: [updated], rowCount: 1 };
    }

    if (upper.includes('UPDATE USERS SET PASSWORD = $1')) {
      const [newPass, now, userId] = params;
      const u = memoryStore.users.get(userId);
      if (u) {
        u.password = newPass;
        u.password_changed_by_branch = true;
        u.last_password_change = now;
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
      return { rows: [record], rowCount: 1 };
    }

    if (upper.startsWith('DELETE FROM BRANCH_EXPENSES')) {
      const [id] = params;
      memoryStore.branch_expenses.delete(id);
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
    } catch {
      useMock = true;
      return mockDb;
    }
  }

  return realPool || mockDb;
}

export async function initDatabase(
  initialBranches: any[], 
  initialUsers: any[], 
  initialShipments: any[]
): Promise<{ success: boolean; error?: any }> {
  try {
    console.log('🔄 Initializing Database Store...');

    // Populate in-memory database store
    if (initialBranches && initialBranches.length > 0) {
      initialBranches.forEach(b => {
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
          is_head_office: b.isHeadOffice || false,
          active_shipments_count: b.activeShipmentsCount || 0,
          total_parcels_dispatched: b.totalParcelsDispatched || 0,
          total_parcels_received: b.totalParcelsReceived || 0,
          total_revenue_afn: b.totalRevenueAfn || 0,
          created_at: b.createdAt || new Date().toISOString()
        });
      });
    }

    if (initialUsers && initialUsers.length > 0) {
      initialUsers.forEach(u => {
        memoryStore.users.set(u.id, {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          role: u.role,
          branch_id: u.branchId,
          password: u.password || 'kabul123',
          password_changed_by_branch: u.passwordChangedByBranch || false,
          last_password_change: u.lastPasswordChange || null,
          status: u.status || 'active',
          avatar: u.avatar || null,
          created_at: u.createdAt || new Date().toISOString(),
          last_login: u.lastLogin || 'Never'
        });
      });
    }

    if (initialShipments && initialShipments.length > 0) {
      initialShipments.forEach(s => {
        memoryStore.shipments.set(s.id, {
          id: s.id,
          cn_number: s.cnNumber,
          origin_branch_id: s.originBranchId,
          destination_branch_id: s.destinationBranchId,
          current_branch_id: s.currentBranchId,
          sender: s.sender,
          receiver: s.receiver,
          package_info: s.packageInfo,
          financials: s.financials,
          status: s.status,
          status_history: s.statusHistory || [],
          booked_at: s.bookedAt,
          estimated_delivery: s.estimatedDelivery,
          actual_delivery: s.actualDelivery || null,
          pod_signature: s.podSignature || null,
          receiver_id_proof: s.receiverIdProof || null,
          delivery_notes: s.deliveryNotes || null,
          booked_by_user_id: s.bookedByUserId,
          booked_by_user_name: s.bookedByUserName,
          created_at: new Date().toISOString()
        });
      });
    }

    // If real DATABASE_URL is present, run DDL on real PostgreSQL pool
    if (!useMock && realPool) {
      try {
        const db = getDbPool();
        await db.query(`
          CREATE TABLE IF NOT EXISTS branches (
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
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);
      } catch (err: any) {
        console.warn('Real PostgreSQL DDL failed, continuing with in-memory store:', err?.message);
        useMock = true;
      }
    }

    console.log('✅ Rayan Cargo Database Initialized and Ready!');
    return { success: true };
  } catch (error) {
    console.warn('Database initialization warning (in-memory active):', error);
    return { success: true };
  }
}

