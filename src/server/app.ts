import express, { Request, Response, NextFunction } from 'express';
import { 
  getDbPool, 
  initDatabase, 
  wipeDatabaseClean, 
  getDatabaseInfo, 
  SUPABASE_SCHEMA_SQL, 
  connectToSupabase,
  DEFAULT_SUPABASE_DATABASE_URL,
  sanitizeConnectionString
} from './db.ts';
import { INITIAL_BRANCHES, INITIAL_USERS, INITIAL_SHIPMENTS } from '../data/initialData.ts';

// Sanitize DATABASE_URL if provided
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = sanitizeConnectionString(process.env.DATABASE_URL);
}

const app = express();

// 1. CORS Headers for Cross-Origin / Vercel Deployments
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 2. Request body parsers
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// 3. Lazy / Eager Supabase DB initialization
let dbInitialized = false;
async function ensureDbReady() {
  if (!dbInitialized) {
    try {
      await initDatabase(INITIAL_BRANCHES, INITIAL_USERS, INITIAL_SHIPMENTS);
      dbInitialized = true;
    } catch (err) {
      console.warn('DB initialization notice:', err);
    }
  }
}
ensureDbReady().catch(console.warn);

// Middleware to ensure DB is initialized before query
app.use(async (req: Request, res: Response, next: NextFunction) => {
  if (!dbInitialized) {
    await ensureDbReady();
  }
  next();
});

// API Router
const api = express.Router();

// Health Check
api.get('/health', async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { rows } = await db.query('SELECT NOW() as server_time, version() as pg_version');
    const { rows: bCount } = await db.query('SELECT COUNT(*) as count FROM branches');
    const { rows: uCount } = await db.query('SELECT COUNT(*) as count FROM users');
    const { rows: sCount } = await db.query('SELECT COUNT(*) as count FROM shipments');

    res.json({
      status: 'online',
      database: 'Supabase PostgreSQL (AWS South Asia)',
      connected: true,
      serverTime: rows[0]?.server_time || new Date().toISOString(),
      version: rows[0]?.pg_version || 'PostgreSQL 16',
      stats: {
        branches: parseInt(bCount[0]?.count || '0', 10),
        users: parseInt(uCount[0]?.count || '0', 10),
        shipments: parseInt(sCount[0]?.count || '0', 10)
      }
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      connected: false,
      message: err?.message || 'Database connection error'
    });
  }
});

// Database Connection Info
api.get('/database/info', async (req: Request, res: Response) => {
  try {
    const dbInfo = getDatabaseInfo();
    const db = getDbPool();
    let liveTime = new Date().toISOString();
    let pgVersion = 'PostgreSQL';
    try {
      const { rows } = await db.query('SELECT NOW() as server_time, version() as pg_version');
      if (rows && rows[0]) {
        liveTime = rows[0].server_time;
        pgVersion = rows[0].pg_version;
      }
    } catch (e) {
      console.warn('DB query time check:', e);
    }

    const { rows: bCount } = await db.query('SELECT COUNT(*) as count FROM branches');
    const { rows: uCount } = await db.query('SELECT COUNT(*) as count FROM users');
    const { rows: sCount } = await db.query('SELECT COUNT(*) as count FROM shipments');
    const { rows: eCount } = await db.query('SELECT COUNT(*) as count FROM branch_expenses');
    const { rows: stCount } = await db.query('SELECT COUNT(*) as count FROM branch_settlements');

    res.json({
      ...dbInfo,
      serverTime: liveTime,
      pgVersion,
      stats: {
        branches: parseInt(bCount[0]?.count || '0', 10),
        users: parseInt(uCount[0]?.count || '0', 10),
        shipments: parseInt(sCount[0]?.count || '0', 10),
        expenses: parseInt(eCount[0]?.count || '0', 10),
        settlements: parseInt(stCount[0]?.count || '0', 10)
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

api.get('/database/schema', (req: Request, res: Response) => {
  res.type('text/plain').send(SUPABASE_SCHEMA_SQL);
});

// 1. Branches API
api.get('/branches', async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { rows } = await db.query('SELECT * FROM branches ORDER BY is_head_office DESC, name ASC');
    const formatted = rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      nameFa: r.name_fa || r.name,
      namePs: r.name_ps || r.name,
      code: r.code,
      province: r.province,
      city: r.city,
      address: r.address,
      phone: r.phone,
      email: r.email,
      managerName: r.manager_name,
      tazkiraNumber: r.tazkira_number || r.tazkiraNumber || '',
      isHeadOffice: r.is_head_office,
      activeShipmentsCount: parseInt(r.active_shipments_count || '0', 10),
      totalParcelsDispatched: parseInt(r.total_parcels_dispatched || '0', 10),
      totalParcelsReceived: parseInt(r.total_parcels_received || '0', 10),
      totalRevenueAfn: parseFloat(r.total_revenue_afn || '0'),
      createdAt: r.created_at
    }));
    res.json({ success: true, branches: formatted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

api.post('/branches', async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const b = req.body;
    if (!b.name || !b.code || !b.email) {
      return res.status(400).json({ success: false, error: 'Name, code, and email are required.' });
    }
    const cleanCode = b.code.trim().toUpperCase();
    const branchId = b.id || `br_${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now().toString().slice(-4)}`;
    const now = new Date().toISOString();

    await db.query(
      `INSERT INTO branches (
        id, name, name_fa, name_ps, code, province, city, address, phone, email,
        manager_name, tazkira_number, is_head_office, active_shipments_count, total_parcels_dispatched,
        total_parcels_received, total_revenue_afn, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        name_fa = EXCLUDED.name_fa,
        name_ps = EXCLUDED.name_ps,
        code = EXCLUDED.code,
        province = EXCLUDED.province,
        city = EXCLUDED.city,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        manager_name = EXCLUDED.manager_name,
        tazkira_number = EXCLUDED.tazkira_number,
        address = EXCLUDED.address`,
      [
        branchId, b.name, b.nameFa || b.name, b.namePs || b.name, cleanCode,
        b.province, b.city, b.address, b.phone, b.email, b.managerName,
        b.tazkiraNumber || b.tazkira_number || '',
        b.isHeadOffice || false, b.activeShipmentsCount || 0,
        b.totalParcelsDispatched || 0, b.totalParcelsReceived || 0,
        b.totalRevenueAfn || 0, now
      ]
    );

    // Create branch manager user
    const initialPass = b.initialPassword?.trim() || `${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '')}123`;
    const userId = `usr_${branchId}`;
    await db.query(
      `INSERT INTO users (
        id, name, email, phone, role, branch_id, password, password_changed_by_branch,
        status, created_at, last_login
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        name = EXCLUDED.name`,
      [
        userId, b.managerName || `${b.name} Manager`, b.email.toLowerCase(),
        b.phone, 'branch_manager', branchId, initialPass, false, 'active', now, 'Never'
      ]
    );

    res.json({
      success: true,
      branch: { ...b, id: branchId, createdAt: now },
      user: { id: userId, email: b.email.toLowerCase(), password: initialPass }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

api.delete('/branches/:id', async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const branchId = req.params.id;
    // Delete associated branch users
    await db.query('DELETE FROM users WHERE branch_id = $1', [branchId]);
    // Delete branch
    await db.query('DELETE FROM branches WHERE id = $1', [branchId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Users API
api.get('/users', async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { rows } = await db.query('SELECT * FROM users ORDER BY created_at ASC');
    const formatted = rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      role: r.role,
      branchId: r.branch_id,
      password: r.password,
      passwordChangedByBranch: r.password_changed_by_branch,
      lastPasswordChange: r.last_password_change,
      status: r.status,
      avatar: r.avatar,
      createdAt: r.created_at,
      lastLogin: r.last_login
    }));
    res.json({ success: true, users: formatted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

api.post('/users/change-password', async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { userId, newPassword } = req.body;
    const now = new Date().toISOString();

    await db.query(
      `UPDATE users SET password = $1, password_changed_by_branch = true, last_password_change = $2 WHERE id = $3`,
      [newPassword.trim(), now, userId]
    );

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

api.post('/users/credentials', async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { userId, email, password, name, phone } = req.body;

    await db.query(
      `UPDATE users SET 
        email = COALESCE($1, email),
        password = COALESCE($2, password),
        name = COALESCE($3, name),
        phone = COALESCE($4, phone),
        password_changed_by_branch = false
      WHERE id = $5`,
      [email?.trim(), password?.trim(), name?.trim(), phone?.trim(), userId]
    );

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Shipments API
api.get('/shipments', async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { rows } = await db.query('SELECT * FROM shipments ORDER BY booked_at DESC');
    const formatted = rows.map((r: any) => ({
      id: r.id,
      cnNumber: r.cn_number,
      originBranchId: r.origin_branch_id,
      destinationBranchId: r.destination_branch_id,
      currentBranchId: r.current_branch_id,
      sender: typeof r.sender === 'string' ? JSON.parse(r.sender) : r.sender,
      receiver: typeof r.receiver === 'string' ? JSON.parse(r.receiver) : r.receiver,
      packageInfo: typeof r.package_info === 'string' ? JSON.parse(r.package_info) : r.package_info,
      financials: typeof r.financials === 'string' ? JSON.parse(r.financials) : r.financials,
      status: r.status,
      statusHistory: typeof r.status_history === 'string' ? JSON.parse(r.status_history || '[]') : (r.status_history || []),
      bookedAt: r.booked_at instanceof Date ? r.booked_at.toISOString() : r.booked_at,
      estimatedDelivery: r.estimated_delivery instanceof Date ? r.estimated_delivery.toISOString() : r.estimated_delivery,
      actualDelivery: r.actual_delivery instanceof Date ? r.actual_delivery.toISOString() : r.actual_delivery,
      podSignature: r.pod_signature,
      receiverIdProof: r.receiver_id_proof,
      deliveryNotes: r.delivery_notes,
      bookedByUserId: r.booked_by_user_id,
      bookedByUserName: r.booked_by_user_name,
      isCustomerPrebooked: r.is_customer_prebooked === true || r.is_pre_booking === true || r.status === 'pre_booked' || r.status === 'verified',
      isPreBooking: r.is_customer_prebooked === true || r.is_pre_booking === true || r.status === 'pre_booked' || r.status === 'verified',
      customerUserId: r.customer_user_id || undefined,
      customerSubmissionAt: r.customer_submission_at || undefined,
      customerSubmissionReference: r.customer_submission_reference || undefined,
      customerSubmissionBy: r.customer_submission_by || undefined
    }));
    res.json({ success: true, shipments: formatted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

api.post('/shipments', async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const s = req.body;
    let cn = s.cnNumber;
    if (!cn) {
      const { rows } = await db.query('SELECT cn_number FROM shipments');
      let maxNum = 1499;
      rows.forEach((r: any) => {
        const m = (r.cn_number || '').match(/(?:ARM|RYN)?(?:-PR)?-?(\d+)/i);
        if (m) {
          const v = parseInt(m[1], 10);
          if (!isNaN(v) && v >= 1500 && v < 100000 && v > maxNum) {
            maxNum = v;
          }
        }
      });
      cn = `ARM-${maxNum + 1}`;
    }
    const id = s.id || `shp_${cn.replace(/[^0-9a-zA-Z]/g, '_').toLowerCase()}`;
    const now = new Date().toISOString();
    const isPre = s.isCustomerPrebooked || s.isPreBooking || s.status === 'pre_booked' || s.status === 'verified' || false;

    await db.query(
      `INSERT INTO shipments (
        id, cn_number, origin_branch_id, destination_branch_id, current_branch_id,
        sender, receiver, package_info, financials, status, status_history, booked_at,
        estimated_delivery, booked_by_user_id, booked_by_user_name, is_customer_prebooked, is_pre_booking, customer_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        financials = EXCLUDED.financials,
        package_info = EXCLUDED.package_info,
        status_history = EXCLUDED.status_history,
        is_customer_prebooked = EXCLUDED.is_customer_prebooked,
        is_pre_booking = EXCLUDED.is_pre_booking,
        customer_user_id = EXCLUDED.customer_user_id`,
      [
        id, cn, s.originBranchId, s.destinationBranchId, s.originBranchId,
        JSON.stringify(s.sender), JSON.stringify(s.receiver), JSON.stringify(s.packageInfo),
        JSON.stringify(s.financials), s.status || (isPre ? 'pre_booked' : 'booked'), JSON.stringify(s.statusHistory || []),
        s.bookedAt || now, s.estimatedDelivery, s.bookedByUserId, s.bookedByUserName,
        isPre, isPre, s.customerUserId || null
      ]
    );

    // Update branch totals in database
    await db.query(
      `UPDATE branches SET 
        total_parcels_dispatched = total_parcels_dispatched + 1,
        total_revenue_afn = total_revenue_afn + $1
      WHERE id = $2`,
      [s.financials?.totalAmount || 0, s.originBranchId]
    );

    res.json({
      success: true,
      shipment: {
        ...s,
        id,
        cnNumber: cn,
        bookedAt: s.bookedAt || now,
        status: s.status || 'booked'
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

api.patch('/shipments/:id/status', async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { id } = req.params;
    const { 
      status, 
      statusHistory, 
      actualDelivery, 
      financials, 
      sender, 
      receiver, 
      packageInfo, 
      customerSubmissionAt, 
      customerSubmissionReference, 
      customerSubmissionBy, 
      currentBranchId, 
      originBranchId,
      destinationBranchId,
      destBranchCommission,
      originRemittanceDue,
      isPreBooking,
      isCustomerPrebooked,
      weightKg,
      pieces,
      price,
      totalAmount,
      userBranchId, 
      userRole 
    } = req.body;

    // Fetch existing shipment to check origin and current state
    const { rows: existing } = await db.query('SELECT status, origin_branch_id, package_info, financials, sender, receiver FROM shipments WHERE id = $1', [id]);
    
    if (existing.length > 0) {
      const shipment = existing[0];
      const isSuperAdmin = userRole === 'super_admin';
      const isOriginBranch = userBranchId && userBranchId === shipment.origin_branch_id;

      // When modifying or verifying a pre-booked shipment:
      if (shipment.status === 'pre_booked') {
        // Both super_admin and origin branch are authorized to verify, weigh, price, or modify content
        if (!isSuperAdmin && !isOriginBranch) {
          return res.status(403).json({ 
            success: false, 
            error: 'Only the origin branch or central super admin can verify and update this pre-booking.' 
          });
        }
      }
    }

    // Merge package_info if weightKg or pieces supplied directly
    let finalPackageInfo = packageInfo ? (typeof packageInfo === 'string' ? JSON.parse(packageInfo) : { ...packageInfo }) : null;
    if (weightKg !== undefined || pieces !== undefined) {
      if (!finalPackageInfo && existing.length > 0 && existing[0].package_info) {
        finalPackageInfo = typeof existing[0].package_info === 'string' ? JSON.parse(existing[0].package_info) : { ...existing[0].package_info };
      }
      finalPackageInfo = finalPackageInfo || {};
      if (weightKg !== undefined) finalPackageInfo.weightKg = Number(weightKg);
      if (pieces !== undefined) finalPackageInfo.pieces = Number(pieces);
    }

    // Merge financials if price or totalAmount supplied directly
    let finalFinancials = financials ? (typeof financials === 'string' ? JSON.parse(financials) : { ...financials }) : null;
    if (price !== undefined || totalAmount !== undefined) {
      if (!finalFinancials && existing.length > 0 && existing[0].financials) {
        finalFinancials = typeof existing[0].financials === 'string' ? JSON.parse(existing[0].financials) : { ...existing[0].financials };
      }
      finalFinancials = finalFinancials || {};
      const newAmt = Number(price !== undefined ? price : totalAmount);
      finalFinancials.totalAmount = newAmt;
      if (finalFinancials.productPrice === undefined) finalFinancials.productPrice = newAmt;
    }

    const finalIsPreBooking = isPreBooking !== undefined ? isPreBooking : (isCustomerPrebooked !== undefined ? isCustomerPrebooked : (status === 'verified' || status === 'booked' ? false : null));

    await db.query(
      `UPDATE shipments SET 
        status = COALESCE($1, status),
        status_history = COALESCE($2::jsonb, status_history),
        actual_delivery = COALESCE($3, actual_delivery),
        financials = COALESCE($4::jsonb, financials),
        sender = COALESCE($5::jsonb, sender),
        receiver = COALESCE($6::jsonb, receiver),
        package_info = COALESCE($7::jsonb, package_info),
        customer_submission_at = COALESCE($8, customer_submission_at),
        customer_submission_reference = COALESCE($9, customer_submission_reference),
        customer_submission_by = COALESCE($10, customer_submission_by),
        current_branch_id = COALESCE($11, current_branch_id),
        origin_branch_id = COALESCE($12, origin_branch_id),
        destination_branch_id = COALESCE($13, destination_branch_id),
        dest_branch_commission = COALESCE($14, dest_branch_commission),
        origin_remittance_due = COALESCE($15, origin_remittance_due),
        is_pre_booking = COALESCE($16, is_pre_booking)
      WHERE id = $17`,
      [
        status || null,
        statusHistory ? JSON.stringify(statusHistory) : null,
        actualDelivery || null,
        finalFinancials ? JSON.stringify(finalFinancials) : null,
        sender ? JSON.stringify(sender) : null,
        receiver ? JSON.stringify(receiver) : null,
        finalPackageInfo ? JSON.stringify(finalPackageInfo) : null,
        customerSubmissionAt || null,
        customerSubmissionReference || null,
        customerSubmissionBy || null,
        currentBranchId || null,
        originBranchId || null,
        destinationBranchId || null,
        destBranchCommission !== undefined ? destBranchCommission : null,
        originRemittanceDue !== undefined ? originRemittanceDue : null,
        finalIsPreBooking,
        id
      ]
    );

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Branch Expenses API
api.get('/expenses', async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { branchId } = req.query;
    let query = 'SELECT * FROM branch_expenses ORDER BY expense_date DESC, created_at DESC';
    let params: any[] = [];

    if (branchId && branchId !== 'all') {
      query = 'SELECT * FROM branch_expenses WHERE branch_id = $1 ORDER BY expense_date DESC, created_at DESC';
      params = [branchId as string];
    }

    const { rows } = await db.query(query, params);
    const formatted = rows.map((r: any) => ({
      id: r.id,
      branchId: r.branch_id,
      category: r.category,
      amount: parseFloat(r.amount || '0'),
      description: r.description,
      expenseDate: r.expense_date,
      paidTo: r.paid_to,
      receiptNumber: r.receipt_number,
      createdByName: r.created_by_name,
      createdAt: r.created_at
    }));
    res.json({ success: true, expenses: formatted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

api.post('/expenses', async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const e = req.body;
    const id = e.id || `exp_${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();
    const expDate = e.expenseDate || new Date().toISOString().split('T')[0];

    await db.query(
      `INSERT INTO branch_expenses (
        id, branch_id, category, amount, description, expense_date, paid_to,
        receipt_number, created_by_name, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO NOTHING`,
      [
        id, e.branchId, e.category, e.amount, e.description, expDate,
        e.paidTo || null, e.receiptNumber || null, e.createdByName || 'Branch Manager', now
      ]
    );

    res.json({
      success: true,
      expense: {
        id,
        branchId: e.branchId,
        category: e.category,
        amount: parseFloat(e.amount),
        description: e.description,
        expenseDate: expDate,
        paidTo: e.paidTo,
        receiptNumber: e.receiptNumber,
        createdByName: e.createdByName || 'Branch Manager',
        createdAt: now
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

api.delete('/expenses/:id', async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { id } = req.params;
    await db.query('DELETE FROM branch_expenses WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Inter-Branch Settlements API
api.get('/settlements', async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { rows } = await db.query('SELECT * FROM branch_settlements ORDER BY settled_at DESC LIMIT 100');
    const formatted = rows.map((r: any) => ({
      id: r.id,
      shipmentId: r.shipment_id,
      cnNumber: r.cn_number,
      originBranchId: r.origin_branch_id,
      destinationBranchId: r.destination_branch_id,
      grossCollectedAmount: parseFloat(r.gross_collected_amount || '0'),
      destBranchCommission: parseFloat(r.dest_branch_commission || '0'),
      netRemittedAmount: parseFloat(r.net_remitted_amount || '0'),
      settlementChannel: r.settlement_channel,
      sarafiReferenceNo: r.sarafi_reference_no,
      settlementStatus: r.settlement_status,
      settledByUserName: r.settled_by_user_name,
      settledAt: r.settled_at,
      notes: r.notes,
      createdAt: r.created_at
    }));
    res.json({ success: true, settlements: formatted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

api.post('/settlements', async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const s = req.body;
    const id = s.id || `stl_${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();

    await db.query(
      `INSERT INTO branch_settlements (
        id, shipment_id, cn_number, origin_branch_id, destination_branch_id,
        gross_collected_amount, dest_branch_commission, net_remitted_amount,
        settlement_channel, sarafi_reference_no, settlement_status,
        settled_by_user_name, settled_at, notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (id) DO NOTHING`,
      [
        id, s.shipmentId || null, s.cnNumber, s.originBranchId, s.destinationBranchId,
        s.grossCollectedAmount || 0, s.destBranchCommission || 100, s.netRemittedAmount || 0,
        s.settlementChannel || 'sarafi_hawala', s.sarafiReferenceNo || null,
        s.settlementStatus || 'settled', s.settledByUserName || 'Branch Cashier',
        s.settledAt || now, s.notes || null, now
      ]
    );

    if (s.shipmentId) {
      await db.query(
        `UPDATE shipments SET remittance_status = 'settled', origin_remittance_due = 0 WHERE id = $1`,
        [s.shipmentId]
      );
    }

    res.json({ success: true, settlement: { ...s, id, createdAt: now } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5b. Remittances API (Transfers submitted by Branches to Main Branch HQ)
api.get('/remittances', async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { rows } = await db.query('SELECT * FROM branch_settlements ORDER BY created_at DESC LIMIT 100');
    const formatted = rows.map((r: any) => ({
      id: r.id,
      batchNumber: r.sarafi_reference_no ? `REM-${r.sarafi_reference_no}` : `REM-${r.id.slice(-5)}`,
      fromBranchId: r.destination_branch_id || r.branch_id,
      fromBranchName: r.destination_branch_name || r.destination_branch_id || 'Branch',
      toBranchId: 'br_admin_hq',
      toBranchName: 'Main Branch (Kabul HQ)',
      parcelIds: Array.isArray(r.parcel_ids) ? r.parcel_ids : (typeof r.parcel_ids === 'string' ? JSON.parse(r.parcel_ids) : (r.shipment_id ? [r.shipment_id] : [])),
      parcelCount: Array.isArray(r.parcel_ids) ? r.parcel_ids.length : (typeof r.parcel_ids === 'string' ? JSON.parse(r.parcel_ids).length : 1),
      totalCollectedAfn: parseFloat(r.gross_collected_amount || '0'),
      destCommissionAfn: parseFloat(r.dest_branch_commission || '0'),
      transportationFeeAfn: parseFloat(r.transportation_fee || '0'),
      destTotalRetainedAfn: parseFloat(r.dest_branch_commission || '0') + parseFloat(r.transportation_fee || '0'),
      originCommissionAfn: parseFloat(r.origin_branch_commission || '0'),
      totalCommissionKeptAfn: parseFloat(r.total_commission_kept || r.dest_branch_commission || '0'),
      netRemittanceAmountAfn: parseFloat(r.net_remitted_amount || '0'),
      paymentMethod: (r.settlement_channel || 'hawala') as any,
      referenceNumber: r.sarafi_reference_no,
      status: r.settlement_status === 'settled' ? 'confirmed_by_headoffice' : r.settlement_status === 'disputed' ? 'rejected' : 'submitted_to_headoffice',
      submittedByUserId: 'usr_manager',
      submittedByUserName: r.settled_by_user_name || 'Branch Manager',
      submittedAt: r.settled_at || r.created_at,
      notes: r.notes
    }));
    res.json({ success: true, remittances: formatted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

api.post('/remittances', async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const r = req.body;
    const id = r.id || `rem_${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();
    const settlementChannel = r.paymentMethod === 'hawala' ? 'sarafi_hawala'
      : r.paymentMethod === 'cash_handover' ? 'cash_courier'
      : r.paymentMethod === 'treasury' ? 'internal_offset'
      : r.paymentMethod || 'bank_transfer';

    const parcelIds = Array.isArray(r.parcelIds) ? Array.from(new Set(r.parcelIds)) : [];
    if (parcelIds.length > 0) {
      const { rows: parcelRows } = await db.query(
        'SELECT id, remittance_status FROM shipments WHERE id = ANY($1::varchar[])',
        [parcelIds]
      );
      const isDuplicate = parcelRows.length !== parcelIds.length || parcelRows.some((p: any) =>
        p.remittance_status && p.remittance_status !== 'pending' && p.remittance_status !== 'unsettled'
      );
      if (isDuplicate) {
        return res.status(409).json({ success: false, error: 'One or more parcels already have a remittance in progress.' });
      }
    }

    await db.query(
      `INSERT INTO branch_settlements (
        id, shipment_id, cn_number, origin_branch_id, destination_branch_id,
        gross_collected_amount, dest_branch_commission, transportation_fee, origin_branch_commission, total_commission_kept, net_remitted_amount,
        settlement_channel, sarafi_reference_no, settlement_status,
        settled_by_user_name, settled_at, notes, created_at, parcel_ids
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      ON CONFLICT (id) DO UPDATE SET
        settlement_status = EXCLUDED.settlement_status,
        notes = EXCLUDED.notes`,
      [
        id, parcelIds[0] || null, r.batchNumber || `REM-${Date.now().toString().slice(-4)}`,
        r.originBranchId || 'br_admin_hq', r.fromBranchId || 'br_hrt',
        r.totalCollectedAfn || 0, r.destCommissionAfn || 0, r.transportationFeeAfn || 0,
        r.originCommissionAfn || 0, r.totalCommissionKeptAfn || 0, r.netRemittanceAmountAfn || 0,
        settlementChannel,
        r.referenceNumber || r.batchNumber || null,
        r.status === 'confirmed_by_headoffice' ? 'settled' : 'pending',
        r.submittedByUserName || 'Branch Cashier', r.submittedAt || now,
        r.notes || null, now, JSON.stringify(parcelIds)
      ]
    );

    if (parcelIds.length > 0) {
      for (const parcelId of parcelIds) {
        await db.query(
          `UPDATE shipments SET remittance_status = $1 WHERE id = $3`,
          ['submitted_to_headoffice', id, parcelId]
        );
      }
    }

    res.json({ success: true, remittance: { ...r, id, createdAt: now } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

api.patch('/remittances/:id/confirm', async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { id } = req.params;
    const body = req.body;
    const now = new Date().toISOString();

    await db.query(
      `UPDATE branch_settlements SET 
        settlement_status = 'settled',
        notes = COALESCE($1, notes)
      WHERE id = $2`,
      [body.confirmationNotes || 'Confirmed by Head Office Admin', id]
    );

    // Update main branch revenue
    if (body.netRemittanceAmountAfn) {
      await db.query(
        `UPDATE branches SET total_revenue_afn = total_revenue_afn + $1 WHERE is_head_office = TRUE OR id = $2`,
        [parseFloat(body.netRemittanceAmountAfn), 'br_admin_hq']
      );
    }

    if (body.parcelIds && Array.isArray(body.parcelIds)) {
      for (const parcelId of body.parcelIds) {
        await db.query(
          `UPDATE shipments SET remittance_status = $1 WHERE id = $3`,
          ['settled', id, parcelId]
        );
      }
    }

    res.json({ success: true, confirmedAt: now });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

api.patch('/remittances/:id/reject', async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { id } = req.params;
    const { rejectionReason } = req.body;

    await db.query(
      `UPDATE branch_settlements SET 
        settlement_status = 'disputed',
        notes = $1
      WHERE id = $2`,
      [`Rejected by HQ: ${rejectionReason || 'Voucher mismatch'}`, id]
    );

    const body = req.body;
    if (body.parcelIds && Array.isArray(body.parcelIds)) {
      for (const parcelId of body.parcelIds) {
        await db.query(
          `UPDATE shipments SET remittance_status = $1 WHERE id = $3`,
          ['pending', id, parcelId]
        );
      }
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Analytics Revenue Overview Aggregation API
api.get('/analytics/revenue-overview', async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { rows: branchSummary } = await db.query(`
      SELECT 
        b.id,
        b.name,
        b.name_fa,
        b.name_ps,
        b.code,
        b.city,
        b.province,
        COALESCE(SUM(CASE WHEN s.origin_branch_id = b.id THEN (s.financials->>'totalAmount')::numeric ELSE 0 END), 0) AS gross_origin_freight,
        COALESCE(SUM(CASE WHEN s.destination_branch_id = b.id AND (s.financials->>'paymentStatus') = 'to_pay' THEN (s.financials->>'totalAmount')::numeric ELSE 0 END), 0) AS dest_cod_collected,
        COALESCE(SUM(CASE WHEN s.destination_branch_id = b.id THEN COALESCE(s.dest_branch_commission, 100) ELSE 0 END), 0) AS dest_commissions_earned,
        COUNT(CASE WHEN s.origin_branch_id = b.id THEN 1 END) AS dispatched_volume,
        COUNT(CASE WHEN s.destination_branch_id = b.id THEN 1 END) AS received_volume
      FROM branches b
      LEFT JOIN shipments s ON (s.origin_branch_id = b.id OR s.destination_branch_id = b.id)
      GROUP BY b.id, b.name, b.name_fa, b.name_ps, b.code, b.city, b.province
      ORDER BY gross_origin_freight DESC
    `);

    const { rows: expensesSummary } = await db.query(`
      SELECT branch_id, COALESCE(SUM(amount), 0) AS total_expenses, COUNT(*) AS count_expenses
      FROM branch_expenses
      GROUP BY branch_id
    `);

    const expenseMap = new Map();
    expensesSummary.forEach((e: any) => {
      expenseMap.set(e.branch_id, parseFloat(e.total_expenses || '0'));
    });

    let consolidatedGrossFreight = 0;
    let consolidatedDestCommissions = 0;
    let consolidatedExpenses = 0;

    const branchPnL = branchSummary.map((b: any) => {
      const grossFreight = parseFloat(b.gross_origin_freight || '0');
      const destCod = parseFloat(b.dest_cod_collected || '0');
      const destComm = parseFloat(b.dest_commissions_earned || '0');
      const branchExpenses = expenseMap.get(b.id) || 0;
      const netProfit = grossFreight - branchExpenses;
      const profitMargin = grossFreight > 0 ? ((netProfit / grossFreight) * 100) : 0;

      consolidatedGrossFreight += grossFreight;
      consolidatedDestCommissions += destComm;
      consolidatedExpenses += branchExpenses;

      return {
        branchId: b.id,
        name: b.name,
        nameFa: b.name_fa,
        namePs: b.name_ps,
        code: b.code,
        city: b.city,
        province: b.province,
        grossFreight,
        destCodCollected: destCod,
        destCommission: destComm,
        expenses: branchExpenses,
        netProfit,
        profitMarginPercent: Math.round(profitMargin * 10) / 10,
        dispatchedVolume: parseInt(b.dispatched_volume || '0', 10),
        receivedVolume: parseInt(b.received_volume || '0', 10)
      };
    });

    const consolidatedNetProfit = consolidatedGrossFreight - consolidatedExpenses;
    const consolidatedMargin = consolidatedGrossFreight > 0 
      ? ((consolidatedNetProfit / consolidatedGrossFreight) * 100) 
      : 0;

    res.json({
      success: true,
      summary: {
        consolidatedGrossFreight,
        consolidatedDestCommissions,
        consolidatedExpenses,
        consolidatedNetProfit,
        consolidatedMarginPercent: Math.round(consolidatedMargin * 10) / 10,
        totalBranches: branchPnL.length
      },
      branches: branchPnL
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Customer Signup API
api.post('/auth/customer-signup', async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { name, email, phone, password } = req.body;
    const now = new Date().toISOString();
    const userId = `usr_cust_${Date.now().toString().slice(-6)}`;
    const cleanEmail = (email && email.trim()) ? email.trim().toLowerCase() : `cust_${phone.replace(/[^0-9]/g, '')}@rayancustomer.af`;

    await db.query(
      `INSERT INTO users (
        id, name, email, phone, role, branch_id, password, status, created_at, last_login
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO NOTHING`,
      [
        userId, name.trim(), cleanEmail, phone.trim(), 'customer', 'customer',
        password?.trim() || 'customer123', 'active', now, 'Just now'
      ]
    );

    res.json({
      success: true,
      user: {
        id: userId,
        name: name.trim(),
        email: cleanEmail,
        phone: phone.trim(),
        role: 'customer',
        branchId: 'customer',
        status: 'active',
        createdAt: now,
        lastLogin: 'Just now'
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Auth Login API
api.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { identifier, password } = req.body;
    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Email, phone, or account identifier is required' });
    }

    const clean = identifier.trim().toLowerCase();
    const cleanPhone = identifier.replace(/[^0-9]/g, '');
    const cleanPass = (password || '').trim();

    const { rows } = await db.query('SELECT * FROM users');
    
    const matched = rows.find((r: any) => {
      const uEmail = (r.email || '').toLowerCase().trim();
      const uId = (r.id || '').toLowerCase().trim();
      const uName = (r.name || '').toLowerCase().trim();
      const uPhone = (r.phone || '').replace(/[^0-9]/g, '');

      const emailMatch = uEmail === clean;
      const idMatch = uId === clean;
      const nameMatch = clean.length >= 3 && uName === clean;
      const phoneMatch = cleanPhone.length >= 5 && uPhone.length >= 5 && (uPhone.includes(cleanPhone) || cleanPhone.includes(uPhone));
      const adminAliasMatch = (clean === 'admin' || clean === 'armaghansadeq@cargo.af' || clean === 'admin@rayancargo.af' || clean === 'superadmin') && (r.role === 'super_admin' || r.id === 'usr_admin');

      return emailMatch || idMatch || nameMatch || phoneMatch || adminAliasMatch;
    });

    if (!matched && (clean === 'admin' || clean === 'armaghansadeq@cargo.af' || clean === 'admin@rayancargo.af' || clean === 'superadmin')) {
      if (cleanPass === 'Armaghanrayan123' || cleanPass === 'admin123') {
        return res.json({
          success: true,
          user: {
            id: 'usr_admin',
            name: 'Central System Admin',
            email: 'armaghansadeq@cargo.af',
            phone: '+93 79 900 1122',
            role: 'super_admin',
            branchId: 'all',
            password: 'Armaghanrayan123',
            passwordChangedByBranch: false,
            status: 'active',
            createdAt: new Date().toISOString(),
            lastLogin: 'Just now'
          }
        });
      }
    }

    if (!matched) {
      return res.status(401).json({ success: false, message: 'Account not found. Please verify your email or phone.' });
    }

    const isSuperAdmin = matched.role === 'super_admin' || matched.email?.toLowerCase() === 'armaghansadeq@cargo.af' || matched.email?.toLowerCase() === 'admin@rayancargo.af' || matched.id === 'usr_admin';
    let passValid = false;
    if (!cleanPass && !matched.password) {
      passValid = true;
    } else if (cleanPass) {
      if (matched.password && matched.password === cleanPass) {
        passValid = true;
      } else if (isSuperAdmin && (cleanPass === 'Armaghanrayan123' || cleanPass === 'admin123')) {
        passValid = true;
      }
    }

    if (!passValid) {
      return res.status(401).json({ success: false, message: 'Invalid password. Please check your password.' });
    }

    const formatted = {
      id: matched.id,
      name: matched.name,
      email: matched.email,
      phone: matched.phone,
      role: matched.role,
      branchId: matched.branch_id,
      password: matched.password,
      passwordChangedByBranch: matched.password_changed_by_branch,
      lastPasswordChange: matched.last_password_change,
      status: matched.status,
      avatar: matched.avatar,
      createdAt: matched.created_at,
      lastLogin: 'Just now'
    };

    res.json({ success: true, user: formatted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Supabase Connect & Migrate endpoint
api.post('/database/connect', async (req: Request, res: Response) => {
  try {
    const { connectionString, password } = req.body;
    let finalConn = (connectionString || '').trim();

    if (!finalConn && password) {
      const pass = encodeURIComponent(password.trim());
      finalConn = `postgresql://postgres.wgdmwuhkuanxykwqvpyp:${pass}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`;
    }

    if (!finalConn) {
      return res.status(400).json({ success: false, error: 'Database password or full connection string is required.' });
    }

    let result = await connectToSupabase(finalConn);
    if (!result.success && password && !connectionString) {
      const pass = encodeURIComponent(password.trim());
      const sessionConn = `postgresql://postgres.wgdmwuhkuanxykwqvpyp:${pass}@aws-0-ap-south-1.pooler.supabase.com:5432/postgres`;
      const retryResult = await connectToSupabase(sessionConn);
      if (retryResult.success) {
        result = retryResult;
      }
    }
    if (result.success) {
      res.json({ success: true, message: result.message });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. Public CN Tracking API
api.get('/track/:cn', async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { cn } = req.params;
    const cleaned = cn.trim().toUpperCase();

    const { rows } = await db.query(
      `SELECT * FROM shipments WHERE 
        UPPER(cn_number) = $1 OR 
        sender->>'phone' LIKE $2 OR 
        receiver->>'phone' LIKE $2 
      LIMIT 1`,
      [cleaned, `%${cleaned}%`]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Parcel not found' });
    }

    const r = rows[0];
    res.json({
      success: true,
      shipment: {
        id: r.id,
        cnNumber: r.cn_number,
        originBranchId: r.origin_branch_id,
        destinationBranchId: r.destination_branch_id,
        currentBranchId: r.current_branch_id,
        sender: typeof r.sender === 'string' ? JSON.parse(r.sender) : r.sender,
        receiver: typeof r.receiver === 'string' ? JSON.parse(r.receiver) : r.receiver,
        packageInfo: typeof r.package_info === 'string' ? JSON.parse(r.package_info) : r.package_info,
        financials: typeof r.financials === 'string' ? JSON.parse(r.financials) : r.financials,
        status: r.status,
        statusHistory: typeof r.status_history === 'string' ? JSON.parse(r.status_history || '[]') : (r.status_history || []),
        bookedAt: r.booked_at,
        estimatedDelivery: r.estimated_delivery,
        actualDelivery: r.actual_delivery
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. System Clean Slate Reset (0 Parcels, Preserved Branches, 0 Expenses)
api.post('/system/reset-clean-slate', async (req: Request, res: Response) => {
  try {
    await wipeDatabaseClean(INITIAL_BRANCHES, INITIAL_USERS);
    res.json({
      success: true,
      message: 'System database wiped clean. 0 parcels, 0 expenses, branches preserved with 0 counters.',
      branches: INITIAL_BRANCHES,
      shipments: [],
      expenses: [],
      users: INITIAL_USERS
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Mount the API router at both '/api' and '/'
// This ensures that whether a request comes as '/api/branches', rewritten as '/branches',
// or directly, it will resolve seamlessly on both local server and Vercel serverless.
app.use('/api', api);
app.use('/', api);

export default app;
