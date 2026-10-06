import express, { Request, Response, NextFunction } from 'express';
import { 
  getDbPool, 
  initDatabase, 
  wipeDatabaseClean, 
  getDatabaseInfo, 
  SUPABASE_SCHEMA_SQL, 
  connectToSupabase,
  DEFAULT_SUPABASE_DATABASE_URL,
  sanitizeConnectionString,
  syncAllDataToStore,
  withTransaction
} from './db.ts';
import { INITIAL_BRANCHES, INITIAL_USERS, INITIAL_SHIPMENTS } from '../data/initialData.ts';

// Sanitize DATABASE_URL if provided
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = sanitizeConnectionString(process.env.DATABASE_URL);
}

const app = express();

// 1. Security & CORS Headers for Cross-Origin / Vercel Deployments
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-User-Role, X-User-Id');
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'SAMEORIGIN');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// In-memory sliding-window rate limiter for sensitive endpoints
interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const rateLimitStore = new Map<string, RateLimitEntry>();

function authRateLimiter(maxAttempts = 30, windowMs = 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'local';
    const now = Date.now();
    const entry = rateLimitStore.get(ip);

    if (!entry || now > entry.resetAt) {
      rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= maxAttempts) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        success: false,
        error: 'Too many authentication attempts. Please wait 60 seconds before trying again.',
        retryAfter
      });
    }

    entry.count++;
    next();
  };
}

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
    } catch (err: any) {
      console.info('ℹ️ DB initialization notice:', err?.message || err);
    }
  }
}
ensureDbReady().catch((e) => console.info('ℹ️ DB ready notice:', e?.message || e));

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

// Sync client state to database
api.post('/database/sync', async (req: Request, res: Response) => {
  try {
    const { branches, users, shipments, expenses, settlements } = req.body || {};
    const result = await syncAllDataToStore({ branches, users, shipments, expenses, settlements });
    res.json({ success: true, message: 'Database state synchronized successfully.', stats: result.stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// 1. Branches API
const SQL_BRANCH_COLS = 'id, name, name_fa, name_ps, code, province, city, address, phone, email, manager_name, tazkira_number, is_head_office, active_shipments_count, total_parcels_dispatched, total_parcels_received, total_revenue_afn, created_at';
const SQL_USER_SAFE_COLS = 'id, name, email, phone, role, branch_id, password_changed_by_branch, last_password_change, status, avatar, created_at, last_login, preferences';
const SQL_SHIPMENT_COLS = 'id, cn_number, origin_branch_id, destination_branch_id, current_branch_id, sender, receiver, package_info, financials, status, status_history, is_customer_prebooked, is_pre_booking, customer_user_id, booked_at, estimated_delivery, actual_delivery, pod_signature, receiver_id_proof, delivery_notes, booked_by_user_id, booked_by_user_name, dest_branch_commission, remittance_status, origin_remittance_due, customer_submission_at, customer_submission_reference, customer_submission_by, print_count, last_printed_at, last_printed_by';
const SQL_EXPENSE_COLS = 'id, branch_id, category, amount, description, expense_date, paid_to, receipt_number, created_by_name, created_at';
const SQL_SETTLEMENT_COLS = 'id, shipment_id, cn_number, origin_branch_id, destination_branch_id, branch_id, gross_collected_amount, dest_branch_commission, transportation_fee, origin_branch_commission, total_commission_kept, net_remitted_amount, commission_adjustment_type, commission_adjustment_amount, commission_adjustment_reason, transport_adjustment_type, transport_adjustment_amount, transport_adjustment_reason, settlement_channel, sarafi_reference_no, settlement_status, settled_by_user_name, settled_at, notes, created_at, parcel_ids';

api.get('/branches', async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { rows } = await db.query(`SELECT ${SQL_BRANCH_COLS} FROM branches ORDER BY is_head_office DESC, name ASC`);
    const cleanBranchMap: Record<string, { name: string; nameFa: string; namePs?: string }> = {
      'br_admin_hq': { name: 'Kabul', nameFa: 'کابل', namePs: 'کابل' },
      'br_mzk_02': { name: 'Mazar-i-Sharif', nameFa: 'مزار شریف', namePs: 'مزار شریف' },
      'br_hrt_03': { name: 'Herat', nameFa: 'هرات', namePs: 'هرات' },
      'br_kdh_04': { name: 'Kandahar', nameFa: 'کندهار', namePs: 'کندهار' },
      'br_kho06_0281': { name: 'Khost', nameFa: 'خوست', namePs: 'خوست' },
      'br_far01_8916': { name: 'Maymana', nameFa: 'میمنه', namePs: 'میمنه' },
      'br_jaw08_6896': { name: 'Sheberghan', nameFa: 'شبرغان', namePs: 'شبرغان' },
      'br_tak08_7293': { name: 'Taloqan', nameFa: 'تالقان', namePs: 'تالقان' },
      'br_bad09_9209': { name: 'Faizabad', nameFa: 'فیض آباد', namePs: 'فیض آباد' },
      'br_gzn12_8926': { name: 'Ghazni', nameFa: 'غزنی', namePs: 'غزنی' },
      'br_nan014_3445': { name: 'Jalalabad', nameFa: 'جلال‌آباد', namePs: 'جلال اباد' },
      'br_kun010_8767': { name: 'Kunduz', nameFa: 'کندز', namePs: 'کندز' },
      'br_nim013_1433': { name: 'Nimroz', nameFa: 'نیمروز', namePs: 'نیمروز' },
      'br_sar011_2621': { name: 'Sar-e Pol', nameFa: 'سرپل', namePs: 'سرپل' }
    };

    const formatted = rows.map((r: any) => {
      const clean = cleanBranchMap[r.id];
      let bName = clean?.name || r.name;
      let bNameFa = clean?.nameFa || r.name_fa || r.name;
      let bNamePs = clean?.namePs || r.name_ps || r.name;

      if (bName === 'Transfers sadeq' || bName.toLowerCase().includes('sadeq')) {
        bName = clean?.name || r.city || r.province || 'Branch';
      }
      if (bNameFa === 'انتقالات صادق' || bNameFa === 'Transfers sadeq') {
        bNameFa = clean?.nameFa || r.city || r.province || 'نمایندگی';
      }

      return {
        id: r.id,
        name: bName,
        nameFa: bNameFa,
        namePs: bNamePs,
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
      };
    });
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
    const callerRole = (req.headers['x-user-role'] as string) || req.body?.userRole || (req.query?.userRole as string);

    if (callerRole && callerRole !== 'super_admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized: Only Head Office Super Admin can delete branch terminals.' });
    }

    // Safety: Verify that the central Head Office cannot be deleted
    const { rows: bCheck } = await db.query('SELECT is_head_office, code, name FROM branches WHERE id = $1', [branchId]);
    if (bCheck.length > 0 && bCheck[0].is_head_office) {
      return res.status(400).json({ success: false, error: 'The central Head Office terminal cannot be deleted.' });
    }

    // Delete associated branch users
    await db.query('DELETE FROM users WHERE branch_id = $1', [branchId]);
    // Delete branch
    await db.query('DELETE FROM branches WHERE id = $1', [branchId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Users API (Strictly excludes password/password_hash from general listing)
api.get('/users', async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { rows } = await db.query(`SELECT ${SQL_USER_SAFE_COLS} FROM users ORDER BY created_at ASC`);
    const formatted = rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      role: r.role,
      branchId: r.branch_id,
      passwordChangedByBranch: r.password_changed_by_branch,
      lastPasswordChange: r.last_password_change,
      status: r.status,
      avatar: r.avatar,
      createdAt: r.created_at,
      lastLogin: r.last_login,
      preferences: typeof r.preferences === 'string' ? JSON.parse(r.preferences) : r.preferences
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
    if (!userId || !newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 4) {
      return res.status(400).json({ success: false, error: 'Password must be at least 4 characters.' });
    }
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

api.post('/users/preferences', async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { userId, preferences } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required.' });
    }
    
    await db.query(
      `UPDATE users SET preferences = $1 WHERE id = $2`,
      [JSON.stringify(preferences || {}), userId]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

api.post('/users/credentials', async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const callerRole = (req.headers['x-user-role'] as string) || req.body?.userRole;
    if (callerRole && callerRole !== 'super_admin' && callerRole !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized: Only Head Office Super Admin can provision branch credentials.' });
    }
    const { userId, branchId, email, password, name, phone } = req.body;
    if (!userId && !branchId) {
      return res.status(400).json({ success: false, error: 'User ID or Branch ID is required.' });
    }

    const cleanEmail = email ? email.trim().toLowerCase() : undefined;
    const cleanPass = password ? password.trim() : undefined;
    const cleanName = name ? name.trim() : undefined;
    const cleanPhone = phone ? phone.trim() : undefined;
    const targetUserId = userId || `usr_${branchId}`;

    const updateRes = await db.query(
      `UPDATE users SET 
        email = COALESCE($1, email),
        password = COALESCE($2, password),
        name = COALESCE($3, name),
        phone = COALESCE($4, phone),
        password_changed_by_branch = false
      WHERE id = $5 OR branch_id = $6`,
      [cleanEmail, cleanPass, cleanName, cleanPhone, targetUserId, branchId || targetUserId]
    );

    if (!updateRes.rowCount || updateRes.rowCount === 0) {
      const now = new Date().toISOString();
      await db.query(
        `INSERT INTO users (
          id, name, email, phone, role, branch_id, password, password_changed_by_branch, status, created_at, last_login
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          password = EXCLUDED.password,
          name = EXCLUDED.name,
          phone = EXCLUDED.phone`,
        [
          targetUserId, cleanName || 'Branch Manager', cleanEmail || `${branchId || 'branch'}@armaghansadeq.af`,
          cleanPhone || '', 'branch_manager', branchId || targetUserId, cleanPass || 'branch123',
          false, 'active', now, 'Never'
        ]
      );
    }

    const targetBranchId = branchId || (targetUserId.startsWith('usr_br_') ? targetUserId.replace('usr_', '') : null);
    if (targetBranchId || cleanEmail) {
      await db.query(
        `UPDATE branches SET 
          email = COALESCE($1, email),
          manager_name = COALESCE($2, manager_name),
          phone = COALESCE($3, phone)
        WHERE id = $4 OR email = $1`,
        [cleanEmail, cleanName, cleanPhone, targetBranchId || '']
      );
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Shipments API
api.get('/shipments', async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { rows } = await db.query(`SELECT ${SQL_SHIPMENT_COLS} FROM shipments ORDER BY booked_at DESC LIMIT 500`);
    const formatted = rows.map((r: any) => {
      const packageInfo = typeof r.package_info === 'string' ? JSON.parse(r.package_info) : r.package_info;
      let financials = typeof r.financials === 'string' ? JSON.parse(r.financials) : (r.financials || {});
      
      const price = Number(financials.productPrice) || Number(packageInfo?.declaredValueAfn) || Number(financials.totalAmount) || 0;
      const origPrice = Number(financials.originalProductPrice) || Number(financials.paymentSettlement?.originalProductPrice) || Number(packageInfo?.declaredValueAfn) || price || 3000;
      const sFee = typeof financials.serviceFee === 'number' && financials.serviceFee > 0 ? financials.serviceFee : (packageInfo?.isFragile ? 200 : 150);
      const dComm = typeof financials.destBranchCommission === 'number' && financials.destBranchCommission > 0 ? financials.destBranchCommission : 70;
      const discount = Number(financials.discountAmount) || 0;
      const total = price > 0 ? price : origPrice;
      const payout = Math.max(0, total - sFee - dComm + discount);
      const isSettledLocked = Boolean(financials.paymentSettlement?.locked);

      financials = {
        ...financials,
        originalProductPrice: origPrice,
        productPrice: total,
        serviceFee: sFee,
        destBranchCommission: dComm,
        discountAmount: discount,
        sellerPayout: isSettledLocked ? (financials.paymentSettlement.reconciledSellerPayout ?? payout) : payout,
        totalAmount: total,
        amountPaid: isSettledLocked ? (financials.paymentSettlement.actualCollectedAmount ?? total) : (financials.paymentStatus === 'paid' ? total : 0),
        amountDue: isSettledLocked || financials.paymentStatus === 'paid' ? 0 : total,
        paymentStatus: isSettledLocked ? (r.status === 'delivered' ? 'paid' : 'unpaid') : (financials.paymentStatus || 'to_pay'),
        paymentMethod: financials.paymentMethod || 'cod'
      };

      return {
        id: r.id,
        cnNumber: r.cn_number,
        originBranchId: r.origin_branch_id,
        destinationBranchId: r.destination_branch_id,
        currentBranchId: r.current_branch_id,
        sender: typeof r.sender === 'string' ? JSON.parse(r.sender) : r.sender,
        receiver: typeof r.receiver === 'string' ? JSON.parse(r.receiver) : r.receiver,
        packageInfo,
        financials,
        paymentSettlement: financials.paymentSettlement || undefined,
        paymentSettlementLocked: isSettledLocked,
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
        customerSubmissionBy: r.customer_submission_by || undefined,
        printCount: Number(r.print_count) || 0,
        lastPrintedAt: r.last_printed_at instanceof Date ? r.last_printed_at.toISOString() : (r.last_printed_at || undefined),
        lastPrintedBy: r.last_printed_by || undefined
      };
    });
    res.json({ success: true, shipments: formatted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Record Print Event (Tracking print count, date/time, and staff user to prevent confusion)
api.post('/shipments/:id/print', async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { id } = req.params;
    const { printedBy } = req.body || {};

    const { rows } = await db.query(
      `UPDATE shipments 
       SET print_count = COALESCE(print_count, 0) + 1,
           last_printed_at = NOW(),
           last_printed_by = COALESCE($1, last_printed_by, 'Staff')
       WHERE id = $2 OR cn_number = $2
       RETURNING id, cn_number, print_count, last_printed_at, last_printed_by`,
      [printedBy || null, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Shipment not found' });
    }

    res.json({
      success: true,
      shipmentId: rows[0].id,
      cnNumber: rows[0].cn_number,
      printCount: Number(rows[0].print_count),
      lastPrintedAt: rows[0].last_printed_at,
      lastPrintedBy: rows[0].last_printed_by
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
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

    // Validate Product Price as mandatory
    const productPriceVal = s.financials?.productPrice ?? s.productPriceAfn ?? s.price;
    if (isPre && (productPriceVal === undefined || productPriceVal === null || Number(productPriceVal) <= 0)) {
      return res.status(400).json({
        success: false,
        error: 'Product Price is mandatory and must be greater than 0.'
      });
    }

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

    const isCompleting = status === 'delivered' || status === 'completed' || status === 'complete';

    if (isCompleting) {
      // Execute completion with atomic SQL transaction to calculate & split Product Price
      // and update branch ledgers atomically
      await withTransaction(async (client) => {
        // Fetch full shipment details for precise calculation
        const { rows: currentRows } = await client.query('SELECT * FROM shipments WHERE id = $1', [id]);
        const currentShipment = currentRows.length > 0 ? currentRows[0] : (existing.length > 0 ? existing[0] : {});

        const currFinancials = currentShipment.financials 
          ? (typeof currentShipment.financials === 'string' ? JSON.parse(currentShipment.financials) : currentShipment.financials)
          : {};

        const origBranchId = originBranchId || currentShipment.origin_branch_id || 'br_admin_hq';
        const dstBranchId = destinationBranchId || currentShipment.destination_branch_id || currentBranchId || 'br_admin_hq';

        // 1. Calculate and split Product Price into Destination Commission & Service/Handling Fee
        const rawProductPrice = Number(
          finalFinancials?.productPrice ?? 
          finalFinancials?.totalAmount ?? 
          currFinancials.productPrice ?? 
          currFinancials.totalAmount ?? 
          price ?? 
          totalAmount ?? 
          0
        );

        // Destination Branch Commission (e.g., 70 or 100 AFN default, or explicitly set)
        const computedDestCommission = Number(
          destBranchCommission ?? 
          finalFinancials?.destBranchCommission ?? 
          currFinancials.destBranchCommission ?? 
          currentShipment.dest_branch_commission ?? 
          (rawProductPrice > 0 ? 70 : 0)
        );

        // Service & Handling Fee (origin transport + handling charges)
        const computedServiceFee = Number(
          finalFinancials?.serviceFee ?? 
          currFinancials.serviceFee ?? 
          (rawProductPrice > 0 ? Math.max(0, 150) : 0)
        );

        // Discount
        const computedDiscount = Number(
          finalFinancials?.discountAmount ?? 
          currFinancials.discountAmount ?? 
          0
        );

        // Net Seller Payout (deducting service fee and dest commission)
        const computedSellerPayout = Math.max(
          0, 
          rawProductPrice - computedDestCommission - computedServiceFee + computedDiscount
        );

        // Receiver total payable at destination (COD product price)
        const computedTotalPayable = rawProductPrice > 0 ? rawProductPrice : Number(currFinancials.totalAmount || 0);

        const hasLockedSettlement = Boolean(finalFinancials?.paymentSettlement?.locked || currFinancials?.paymentSettlement?.locked);
        const mergedFinancials = {
          ...currFinancials,
          ...(finalFinancials || {}),
          originalProductPrice: finalFinancials?.originalProductPrice ?? currFinancials?.originalProductPrice ?? rawProductPrice,
          productPrice: rawProductPrice,
          destBranchCommission: computedDestCommission,
          serviceFee: computedServiceFee,
          discountAmount: computedDiscount,
          sellerPayout: computedSellerPayout,
          totalAmount: computedTotalPayable,
          amountPaid: hasLockedSettlement ? computedTotalPayable : (currFinancials?.amountPaid || 0),
          amountDue: hasLockedSettlement ? 0 : computedTotalPayable,
          paymentStatus: hasLockedSettlement ? 'paid' : (finalFinancials?.paymentStatus || currFinancials?.paymentStatus || 'to_pay'),
          paymentMethod: finalFinancials?.paymentMethod || currFinancials.paymentMethod || 'cod'
        };

        const deliveryTimestamp = actualDelivery || new Date().toISOString();

        // 2. Atomic Step 1: Update Shipment status, financials, and remittance state
        await client.query(
          `UPDATE shipments SET 
            status = 'delivered',
            status_history = COALESCE($1::jsonb, status_history),
            actual_delivery = $2,
            financials = $3::jsonb,
            dest_branch_commission = $4,
            origin_remittance_due = $5,
            remittance_status = 'pending',
            current_branch_id = $6,
            is_pre_booking = false
          WHERE id = $7`,
          [
            statusHistory ? JSON.stringify(statusHistory) : null,
            deliveryTimestamp,
            JSON.stringify(mergedFinancials),
            computedDestCommission,
            computedSellerPayout,
            dstBranchId,
            id
          ]
        );

        // 3. Atomic Step 2: Update Destination Branch Ledger (Add Destination Commission)
        if (dstBranchId && computedDestCommission > 0) {
          await client.query(
            `UPDATE branches SET 
              total_revenue_afn = total_revenue_afn + $1,
              total_parcels_received = total_parcels_received + 1,
              active_shipments_count = GREATEST(0, active_shipments_count - 1)
            WHERE id = $2`,
            [computedDestCommission, dstBranchId]
          );
        } else if (dstBranchId) {
          await client.query(
            `UPDATE branches SET 
              total_parcels_received = total_parcels_received + 1,
              active_shipments_count = GREATEST(0, active_shipments_count - 1)
            WHERE id = $1`,
            [dstBranchId]
          );
        }

        // 4. Atomic Step 3: Update Origin Branch Ledger (Add Service Fee net of discount)
        const originNetServiceRevenue = Math.max(0, computedServiceFee - computedDiscount);
        if (origBranchId && originNetServiceRevenue > 0) {
          await client.query(
            `UPDATE branches SET 
              total_revenue_afn = total_revenue_afn + $1,
              active_shipments_count = GREATEST(0, active_shipments_count - 1)
            WHERE id = $2`,
            [originNetServiceRevenue, origBranchId]
          );
        } else if (origBranchId) {
          await client.query(
            `UPDATE branches SET 
              active_shipments_count = GREATEST(0, active_shipments_count - 1)
            WHERE id = $1`,
            [origBranchId]
          );
        }

        // 5. Atomic Step 4: Record audit settlement entry into branch_settlements
        const settlementId = `stl_${id.replace(/[^a-zA-Z0-9_]/g, '')}_${Date.now().toString().slice(-4)}`;
        const cnNumber = currentShipment.cn_number || id;
        
        await client.query(
          `INSERT INTO branch_settlements (
            id, shipment_id, cn_number, origin_branch_id, destination_branch_id,
            gross_collected_amount, dest_branch_commission, net_remitted_amount,
            settlement_channel, settlement_status, settled_by_user_name,
            settled_at, notes, created_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()
          )`,
          [
            settlementId,
            id,
            cnNumber,
            origBranchId,
            dstBranchId,
            computedTotalPayable,
            computedDestCommission,
            computedSellerPayout,
            'sarafi_hawala',
            'pending',
            req.body.completedByUserName || 'Destination Agent',
            deliveryTimestamp,
            `Auto-split on delivery: Product Price ${computedTotalPayable} AFN = Dest Comm ${computedDestCommission} AFN + Service Fee ${computedServiceFee} AFN (Seller Payout: ${computedSellerPayout} AFN)`
          ]
        );
      });

      return res.json({ 
        success: true, 
        message: 'Shipment marked as complete, financials split and branch ledgers updated atomically.' 
      });
    }

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

// Admin-only: Edit parcel info & financials
api.put('/shipments/:id', async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { id } = req.params;
    const {
      userRole,
      userName,
      productPrice,
      serviceFee,
      destBranchCommission,
      discountAmount,
      paymentStatus,
      paymentMethod,
      weightKg,
      pieces,
      description,
      category,
      isFragile,
      senderName,
      senderPhone,
      senderAddress,
      senderCity,
      senderProvince,
      senderNationalId,
      receiverName,
      receiverPhone,
      receiverAddress,
      receiverCity,
      receiverProvince,
      receiverNationalId,
      originBranchId,
      destinationBranchId,
      status,
      auditNote
    } = req.body;

    // Security: Only Head Office Super Admin can edit parcel information
    if (userRole !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Only Head Office Super Admin can modify parcel details and financials.'
      });
    }

    // Fetch existing shipment
    const { rows: existingRows } = await db.query('SELECT * FROM shipments WHERE id = $1', [id]);
    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Shipment not found' });
    }
    const existing = existingRows[0];
    const existingSender = typeof existing.sender === 'string' ? JSON.parse(existing.sender) : (existing.sender || {});
    const existingReceiver = typeof existing.receiver === 'string' ? JSON.parse(existing.receiver) : (existing.receiver || {});
    const existingPkg = typeof existing.package_info === 'string' ? JSON.parse(existing.package_info) : (existing.package_info || {});
    const existingFin = typeof existing.financials === 'string' ? JSON.parse(existing.financials) : (existing.financials || {});
    const existingHistory = typeof existing.status_history === 'string' ? JSON.parse(existing.status_history) : (existing.status_history || []);

    const finalProductPrice = Number(productPrice !== undefined ? productPrice : (existingFin.productPrice ?? existingFin.totalAmount ?? 0));
    const finalServiceFee = Number(serviceFee !== undefined ? serviceFee : (existingFin.serviceFee ?? 150));
    const finalDestCommission = Number(destBranchCommission !== undefined ? destBranchCommission : (existingFin.destBranchCommission ?? existing.dest_branch_commission ?? 70));
    const finalDiscount = Number(discountAmount !== undefined ? discountAmount : (existingFin.discountAmount ?? 0));
    const finalSellerPayout = Math.max(0, finalProductPrice - finalServiceFee - finalDestCommission + finalDiscount);
    const finalPaymentStatus = paymentStatus || existingFin.paymentStatus || 'to_pay';
    const finalStatus = status || existing.status || 'booked';
    const isPaid = finalPaymentStatus === 'paid' || finalStatus === 'delivered';

    const mergedFinancials = {
      ...existingFin,
      productPrice: finalProductPrice,
      totalAmount: finalProductPrice,
      serviceFee: finalServiceFee,
      destBranchCommission: finalDestCommission,
      discountAmount: finalDiscount,
      sellerPayout: finalSellerPayout,
      paymentStatus: finalPaymentStatus,
      paymentMethod: paymentMethod || existingFin.paymentMethod || 'cod',
      amountPaid: isPaid ? finalProductPrice : 0,
      amountDue: isPaid ? 0 : finalProductPrice
    };

    const mergedSender = {
      ...existingSender,
      name: senderName !== undefined ? senderName : existingSender.name,
      phone: senderPhone !== undefined ? senderPhone : existingSender.phone,
      address: senderAddress !== undefined ? senderAddress : existingSender.address,
      city: senderCity !== undefined ? senderCity : existingSender.city,
      province: senderProvince !== undefined ? senderProvince : existingSender.province,
      nationalId: senderNationalId !== undefined ? senderNationalId : existingSender.nationalId
    };

    const mergedReceiver = {
      ...existingReceiver,
      name: receiverName !== undefined ? receiverName : existingReceiver.name,
      phone: receiverPhone !== undefined ? receiverPhone : existingReceiver.phone,
      address: receiverAddress !== undefined ? receiverAddress : existingReceiver.address,
      city: receiverCity !== undefined ? receiverCity : existingReceiver.city,
      province: receiverProvince !== undefined ? receiverProvince : existingReceiver.province,
      nationalId: receiverNationalId !== undefined ? receiverNationalId : existingReceiver.nationalId
    };

    const mergedPackage = {
      ...existingPkg,
      category: category || existingPkg.category || 'general',
      weightKg: Number(weightKg !== undefined ? weightKg : (existingPkg.weightKg ?? 1)),
      pieces: Number(pieces !== undefined ? pieces : (existingPkg.pieces ?? 1)),
      description: description !== undefined ? description : (existingPkg.description ?? ''),
      isFragile: isFragile !== undefined ? Boolean(isFragile) : Boolean(existingPkg.isFragile),
      declaredValueAfn: finalProductPrice
    };

    const auditItem = {
      id: `st_admin_edit_${Date.now()}`,
      status: finalStatus,
      location: 'Head Office Admin HQ',
      branchName: 'Head Office Admin HQ',
      timestamp: new Date().toISOString(),
      note: `[Admin Correction] ${auditNote || 'Parcel data & financials adjusted by Super Admin (' + (userName || 'Admin') + ')'}: Price ${finalProductPrice} AFN, Weight ${mergedPackage.weightKg}kg`,
      updatedBy: `${userName || 'Super Admin'} (Admin)`
    };

    const updatedHistory = [...existingHistory, auditItem];
    const finalOriginBranch = originBranchId || existing.origin_branch_id;
    const finalDestBranch = destinationBranchId || existing.destination_branch_id;
    const originRemittance = Math.max(0, finalProductPrice - finalDestCommission);

    await db.query(
      `UPDATE shipments SET
        origin_branch_id = $1,
        destination_branch_id = $2,
        sender = $3::jsonb,
        receiver = $4::jsonb,
        package_info = $5::jsonb,
        financials = $6::jsonb,
        dest_branch_commission = $7,
        origin_remittance_due = $8,
        status = $9,
        status_history = $10::jsonb
      WHERE id = $11`,
      [
        finalOriginBranch,
        finalDestBranch,
        JSON.stringify(mergedSender),
        JSON.stringify(mergedReceiver),
        JSON.stringify(mergedPackage),
        JSON.stringify(mergedFinancials),
        finalDestCommission,
        originRemittance,
        finalStatus,
        JSON.stringify(updatedHistory),
        id
      ]
    );

    res.json({
      success: true,
      shipment: {
        ...existing,
        id,
        originBranchId: finalOriginBranch,
        destinationBranchId: finalDestBranch,
        sender: mergedSender,
        receiver: mergedReceiver,
        packageInfo: mergedPackage,
        financials: mergedFinancials,
        destBranchCommission: finalDestCommission,
        originRemittanceDue: originRemittance,
        status: finalStatus,
        statusHistory: updatedHistory
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generic partial updates for shipment records (including Financial Clearance fields)
api.patch('/shipments/:id', async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { id } = req.params;
    const updates = req.body;

    // Fetch existing row
    const { rows: existingRows } = await db.query('SELECT * FROM shipments WHERE id = $1', [id]);
    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Shipment not found' });
    }
    const existing = existingRows[0];

    // Combine updates into existing financials
    const mergedFin = {
      ...(typeof existing.financials === 'string' ? JSON.parse(existing.financials) : (existing.financials || {})),
      ...(updates.financials || {})
    };
    if (updates.sellerPayout !== undefined) mergedFin.sellerPayout = Number(updates.sellerPayout);
    if (updates.discountAmount !== undefined) mergedFin.discountAmount = Number(updates.discountAmount);

    const finalDestCommission = Number(updates.destBranchCommission !== undefined ? updates.destBranchCommission : (existing.dest_branch_commission || mergedFin.destBranchCommission || 70));

    await db.query(
      `UPDATE shipments SET
        seller_payout_status = COALESCE($1, seller_payout_status),
        seller_payout_disbursed_at = COALESCE($2, seller_payout_disbursed_at),
        seller_payout_method = COALESCE($3, seller_payout_method),
        seller_payout_voucher_ref = COALESCE($4, seller_payout_voucher_ref),
        seller_payout_disbursed_by_branch_id = COALESCE($5, seller_payout_disbursed_by_branch_id),
        seller_payout_disbursed_by_user_name = COALESCE($6, seller_payout_disbursed_by_user_name),
        seller_payout_notes = COALESCE($7, seller_payout_notes),
        seller_payout_confirmed_at = COALESCE($8, seller_payout_confirmed_at),
        seller_payout_dispute_reason = COALESCE($9, seller_payout_dispute_reason),
        dest_branch_commission = $10,
        financials = $11::jsonb,
        payment_settlement = COALESCE($12::jsonb, payment_settlement),
        payment_settlement_locked = COALESCE($13, payment_settlement_locked)
      WHERE id = $14`,
      [
        updates.sellerPayoutStatus || null,
        updates.sellerPayoutDisbursedAt || null,
        updates.sellerPayoutMethod || null,
        updates.sellerPayoutVoucherRef || null,
        updates.sellerPayoutDisbursedByBranchId || null,
        updates.sellerPayoutDisbursedByUserName || null,
        updates.sellerPayoutNotes || null,
        updates.sellerPayoutConfirmedAt || null,
        updates.sellerPayoutDisputeReason || null,
        finalDestCommission,
        JSON.stringify(mergedFin),
        updates.paymentSettlement ? JSON.stringify(updates.paymentSettlement) : (mergedFin.paymentSettlement ? JSON.stringify(mergedFin.paymentSettlement) : null),
        updates.paymentSettlementLocked !== undefined ? updates.paymentSettlementLocked : (mergedFin.paymentSettlement?.locked ?? null),
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
    let query = `SELECT ${SQL_EXPENSE_COLS} FROM branch_expenses ORDER BY expense_date DESC, created_at DESC LIMIT 500`;
    let params: any[] = [];

    if (branchId && branchId !== 'all') {
      query = `SELECT ${SQL_EXPENSE_COLS} FROM branch_expenses WHERE branch_id = $1 ORDER BY expense_date DESC, created_at DESC LIMIT 500`;
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
    if (!e || !e.branchId) {
      return res.status(400).json({ success: false, error: 'Branch ID is required.' });
    }
    const numAmount = parseFloat(e.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Expense amount must be a positive number.' });
    }
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
        id, e.branchId, e.category || 'other', numAmount, e.description || '', expDate,
        e.paidTo || null, e.receiptNumber || null, e.createdByName || 'Branch Manager', now
      ]
    );

    res.json({
      success: true,
      expense: {
        id,
        branchId: e.branchId,
        category: e.category,
        amount: numAmount,
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
    const { rows } = await db.query(`SELECT ${SQL_SETTLEMENT_COLS} FROM branch_settlements ORDER BY settled_at DESC LIMIT 100`);
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
    const { rows } = await db.query(`SELECT ${SQL_SETTLEMENT_COLS} FROM branch_settlements ORDER BY created_at DESC LIMIT 100`);
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
      destTotalRetainedAfn: parseFloat(r.dest_branch_commission || '0'), // Receiving branch keeps ONLY commission, not transport fee
      originCommissionAfn: parseFloat(r.origin_branch_commission || '0'),
      totalCommissionKeptAfn: parseFloat(r.total_commission_kept || r.dest_branch_commission || '0'),
      netRemittanceAmountAfn: parseFloat(r.net_remitted_amount || '0'),
      commissionAdjustmentType: r.commission_adjustment_type || 'exact',
      commissionAdjustmentAmount: parseFloat(r.commission_adjustment_amount || '0'),
      commissionAdjustmentReason: r.commission_adjustment_reason || '',
      transportAdjustmentType: r.transport_adjustment_type || 'exact',
      transportAdjustmentAmount: parseFloat(r.transport_adjustment_amount || '0'),
      transportAdjustmentReason: r.transport_adjustment_reason || '',
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
        commission_adjustment_type, commission_adjustment_amount, commission_adjustment_reason,
        transport_adjustment_type, transport_adjustment_amount, transport_adjustment_reason,
        settlement_channel, sarafi_reference_no, settlement_status,
        settled_by_user_name, settled_at, notes, created_at, parcel_ids
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      ON CONFLICT (id) DO UPDATE SET
        settlement_status = EXCLUDED.settlement_status,
        notes = EXCLUDED.notes`,
      [
        id, parcelIds[0] || null, r.batchNumber || `REM-${Date.now().toString().slice(-4)}`,
        r.originBranchId || 'br_admin_hq', r.fromBranchId || 'br_hrt',
        r.totalCollectedAfn || 0, r.destCommissionAfn || 0, r.transportationFeeAfn || 0,
        r.originCommissionAfn || 0, r.totalCommissionKeptAfn || 0, r.netRemittanceAmountAfn || 0,
        r.commissionAdjustmentType || 'exact', r.commissionAdjustmentAmount || 0, r.commissionAdjustmentReason || null,
        r.transportAdjustmentType || 'exact', r.transportAdjustmentAmount || 0, r.transportAdjustmentReason || null,
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
api.post('/auth/customer-signup', authRateLimiter(20, 60 * 1000), async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { name, email, phone, password } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, error: 'Full name and phone number are required.' });
    }
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
api.post('/auth/login', authRateLimiter(30, 60 * 1000), async (req: Request, res: Response) => {
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
    const { rows: bRows } = await db.query('SELECT * FROM branches');
    
    let matched = rows.find((r: any) => {
      const uEmail = (r.email || '').toLowerCase().trim();
      const uId = (r.id || '').toLowerCase().trim();
      const uName = (r.name || '').toLowerCase().trim();
      const uPhone = (r.phone || '').replace(/[^0-9]/g, '');

      const emailMatch = uEmail === clean;
      const idMatch = uId === clean;
      const nameMatch = clean.length >= 3 && uName === clean;
      const phoneMatch = cleanPhone.length >= 5 && uPhone.length >= 5 && (uPhone.includes(cleanPhone) || cleanPhone.includes(uPhone));
      const adminAliasMatch = (clean === 'admin' || clean === 'armaghansadeq@cargo.af' || clean === 'admin@rayancargo.af' || clean === 'superadmin') && (r.role === 'super_admin' || r.id === 'usr_admin');

      const b = bRows.find((b: any) => b.id === r.branch_id);
      const bCode = (b?.code || '').toLowerCase().trim();
      const bCleanCode = bCode.replace(/[^a-z0-9]/g, '');
      const cleanNoHyphen = clean.replace(/[^a-z0-9]/g, '');
      const branchCodeMatch = bCode && (bCode === clean || bCleanCode === cleanNoHyphen);
      const branchEmailMatch = b && b.email && b.email.toLowerCase().trim() === clean;
      const branchNameMatch = b && (
        (b.name && b.name.toLowerCase().trim() === clean) ||
        (b.city && b.city.toLowerCase().trim() === clean) ||
        (b.province && b.province.toLowerCase().trim() === clean)
      );

      return emailMatch || idMatch || nameMatch || phoneMatch || adminAliasMatch || branchCodeMatch || branchEmailMatch || branchNameMatch;
    });

    if (!matched) {
      const matchedBranch = bRows.find((b: any) => {
        const bCode = (b.code || '').toLowerCase().trim();
        const bCleanCode = bCode.replace(/[^a-z0-9]/g, '');
        const cleanNoHyphen = clean.replace(/[^a-z0-9]/g, '');
        return bCode === clean || bCleanCode === cleanNoHyphen || (b.email && b.email.toLowerCase().trim() === clean);
      });
      if (matchedBranch) {
        matched = {
          id: `usr_${matchedBranch.id}`,
          name: matchedBranch.manager_name || `${matchedBranch.name} Manager`,
          email: matchedBranch.email || `${matchedBranch.code.toLowerCase()}@armaghansadeq.af`,
          phone: matchedBranch.phone || '',
          role: 'branch_manager',
          branch_id: matchedBranch.id,
          password: `${matchedBranch.code.toLowerCase().replace(/[^a-z0-9]/g, '')}123`,
          password_changed_by_branch: false,
          last_password_change: null,
          status: 'active',
          avatar: null,
          created_at: new Date().toISOString(),
          last_login: 'Never'
        };
      }
    }

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
    const dbPass = (matched.password || '').trim();
    if (!cleanPass && !dbPass) {
      passValid = true;
    } else if (cleanPass) {
      if (dbPass && (dbPass === cleanPass || dbPass.toLowerCase() === cleanPass.toLowerCase())) {
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
      lastLogin: 'Just now',
      preferences: typeof matched.preferences === 'string' ? JSON.parse(matched.preferences) : matched.preferences
    };

    res.json({ success: true, user: formatted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Supabase Connect & Migrate endpoint
api.post('/database/connect', async (req: Request, res: Response) => {
  try {
    const callerRole = (req.headers['x-user-role'] as string) || req.body?.userRole;
    if (callerRole && callerRole !== 'super_admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized: Only Head Office Super Admin can connect external databases.' });
    }

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
    const cleaned = (cn || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');

    if (!cleaned) {
      return res.status(400).json({ success: false, message: 'Invalid Consignment Number or query.' });
    }

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
    const callerRole = (req.headers['x-user-role'] as string) || req.body?.userRole;
    if (callerRole && callerRole !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Only Central Super Admin can execute a system clean-slate wipe.'
      });
    }

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
