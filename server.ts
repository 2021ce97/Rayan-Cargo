import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { getDbPool, initDatabase } from './src/server/db.ts';
import { INITIAL_BRANCHES, INITIAL_USERS, INITIAL_SHIPMENTS } from './src/data/initialData.ts';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Initialize Supabase PostgreSQL
  initDatabase(INITIAL_BRANCHES, INITIAL_USERS, INITIAL_SHIPMENTS)
    .then((res) => {
      if (res.success) {
        console.log('🚀 Connected to Supabase PostgreSQL Pooler (aws-0-ap-south-1.pooler.supabase.com)');
      } else {
        console.warn('⚠️ Supabase connection warning (app will proceed with fallback):', res.error);
      }
    })
    .catch((err) => {
      console.error('Database bootstrap error:', err);
    });

  // --- API Routes ---

  // Health & DB Connection Status
  app.get('/api/health', async (req, res) => {
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
        serverTime: rows[0].server_time,
        version: rows[0].pg_version,
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

  // 1. Branches API
  app.get('/api/branches', async (req, res) => {
    try {
      const db = getDbPool();
      const { rows } = await db.query('SELECT * FROM branches ORDER BY is_head_office DESC, name ASC');
      const formatted = rows.map(r => ({
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

  app.post('/api/branches', async (req, res) => {
    try {
      const db = getDbPool();
      const b = req.body;
      const cleanCode = b.code.trim().toUpperCase();
      const branchId = b.id || `br_${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now().toString().slice(-4)}`;
      const now = new Date().toISOString();

      await db.query(
        `INSERT INTO branches (
          id, name, name_fa, name_ps, code, province, city, address, phone, email,
          manager_name, is_head_office, active_shipments_count, total_parcels_dispatched,
          total_parcels_received, total_revenue_afn, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          name_fa = EXCLUDED.name_fa,
          name_ps = EXCLUDED.name_ps,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          manager_name = EXCLUDED.manager_name,
          address = EXCLUDED.address`,
        [
          branchId, b.name, b.nameFa || b.name, b.namePs || b.name, cleanCode,
          b.province, b.city, b.address, b.phone, b.email, b.managerName,
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

  // 2. Users API
  app.get('/api/users', async (req, res) => {
    try {
      const db = getDbPool();
      const { rows } = await db.query('SELECT * FROM users ORDER BY created_at ASC');
      const formatted = rows.map(r => ({
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

  app.post('/api/users/change-password', async (req, res) => {
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

  app.post('/api/users/credentials', async (req, res) => {
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
  app.get('/api/shipments', async (req, res) => {
    try {
      const db = getDbPool();
      const { rows } = await db.query('SELECT * FROM shipments ORDER BY booked_at DESC');
      const formatted = rows.map(r => ({
        id: r.id,
        cnNumber: r.cn_number,
        originBranchId: r.origin_branch_id,
        destinationBranchId: r.destination_branch_id,
        currentBranchId: r.current_branch_id,
        sender: r.sender,
        receiver: r.receiver,
        packageInfo: r.package_info,
        financials: r.financials,
        status: r.status,
        statusHistory: r.status_history || [],
        bookedAt: r.booked_at,
        estimatedDelivery: r.estimated_delivery,
        actualDelivery: r.actual_delivery,
        podSignature: r.pod_signature,
        receiverIdProof: r.receiver_id_proof,
        deliveryNotes: r.delivery_notes,
        bookedByUserId: r.booked_by_user_id,
        bookedByUserName: r.booked_by_user_name
      }));
      res.json({ success: true, shipments: formatted });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/shipments', async (req, res) => {
    try {
      const db = getDbPool();
      const s = req.body;
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      const cn = s.cnNumber || `RYN-${randomSuffix}`;
      const id = s.id || `shp_${randomSuffix}`;
      const now = new Date().toISOString();

      await db.query(
        `INSERT INTO shipments (
          id, cn_number, origin_branch_id, destination_branch_id, current_branch_id,
          sender, receiver, package_info, financials, status, status_history, booked_at,
          estimated_delivery, booked_by_user_id, booked_by_user_name
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO NOTHING`,
        [
          id, cn, s.originBranchId, s.destinationBranchId, s.originBranchId,
          JSON.stringify(s.sender), JSON.stringify(s.receiver), JSON.stringify(s.packageInfo),
          JSON.stringify(s.financials), s.status || 'booked', JSON.stringify(s.statusHistory || []),
          s.bookedAt || now, s.estimatedDelivery, s.bookedByUserId, s.bookedByUserName
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

  app.patch('/api/shipments/:id/status', async (req, res) => {
    try {
      const db = getDbPool();
      const { id } = req.params;
      const { status, statusHistory, actualDelivery, financials, currentBranchId } = req.body;

      await db.query(
        `UPDATE shipments SET 
          status = $1,
          status_history = $2,
          actual_delivery = COALESCE($3, actual_delivery),
          financials = COALESCE($4, financials),
          current_branch_id = COALESCE($5, current_branch_id)
        WHERE id = $6`,
        [
          status,
          JSON.stringify(statusHistory),
          actualDelivery || null,
          financials ? JSON.stringify(financials) : null,
          currentBranchId || null,
          id
        ]
      );

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. Branch Expenses API
  app.get('/api/expenses', async (req, res) => {
    try {
      const db = getDbPool();
      const { branchId } = req.query;
      let query = 'SELECT * FROM branch_expenses ORDER BY expense_date DESC, created_at DESC';
      let params: any[] = [];

      if (branchId && branchId !== 'all') {
        query = 'SELECT * FROM branch_expenses WHERE branch_id = $1 ORDER BY expense_date DESC, created_at DESC';
        params = [branchId];
      }

      const { rows } = await db.query(query, params);
      const formatted = rows.map(r => ({
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

  app.post('/api/expenses', async (req, res) => {
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

  app.delete('/api/expenses/:id', async (req, res) => {
    try {
      const db = getDbPool();
      const { id } = req.params;
      await db.query('DELETE FROM branch_expenses WHERE id = $1', [id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. Customer Signup API
  app.post('/api/auth/customer-signup', async (req, res) => {
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

  // 6. Public CN Tracking API
  app.get('/api/track/:cn', async (req, res) => {
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
          sender: r.sender,
          receiver: r.receiver,
          packageInfo: r.package_info,
          financials: r.financials,
          status: r.status,
          statusHistory: r.status_history || [],
          bookedAt: r.booked_at,
          estimatedDelivery: r.estimated_delivery,
          actualDelivery: r.actual_delivery
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Rayan Cargo Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
