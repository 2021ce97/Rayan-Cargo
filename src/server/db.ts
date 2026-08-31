import pg from 'pg';
const { Pool } = pg;

// Supabase PostgreSQL Pooler Connection
const connectionString = 
  process.env.DATABASE_URL || 
  'postgresql://postgres.wgdmwuhkuanxykwqvpyp:Cargorayan%40123@aws-0-ap-south-1.pooler.supabase.com:5432/postgres';

let pool: pg.Pool | null = null;

export function getDbPool(): pg.Pool {
  if (!pool) {
    // If the connection string has unencoded @ in password, we also provide parsed config
    try {
      pool = new Pool({
        connectionString,
        ssl: {
          rejectUnauthorized: false
        },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
      });
    } catch {
      // Fallback to explicit credentials
      pool = new Pool({
        host: 'aws-0-ap-south-1.pooler.supabase.com',
        port: 5432,
        user: 'postgres.wgdmwuhkuanxykwqvpyp',
        password: 'Cargorayan@123',
        database: 'postgres',
        ssl: {
          rejectUnauthorized: false
        },
        max: 10
      });
    }

    pool.on('error', (err) => {
      console.error('Unexpected Supabase PostgreSQL Pool Error:', err);
    });
  }
  return pool;
}

export async function initDatabase(initialBranches: any[], initialUsers: any[], initialShipments: any[]) {
  const db = getDbPool();
  
  try {
    console.log('🔄 Initializing Supabase PostgreSQL Database Tables...');

    // 1. Create Branches Table
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

    // 2. Create Users Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        email VARCHAR(128) NOT NULL UNIQUE,
        phone VARCHAR(64) NOT NULL,
        role VARCHAR(32) NOT NULL,
        branch_id VARCHAR(64) NOT NULL,
        password VARCHAR(255) NOT NULL,
        password_changed_by_branch BOOLEAN DEFAULT FALSE,
        last_password_change TIMESTAMPTZ,
        status VARCHAR(32) DEFAULT 'active',
        avatar TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_login VARCHAR(64)
      );
    `);

    // 3. Create Shipments Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS shipments (
        id VARCHAR(64) PRIMARY KEY,
        cn_number VARCHAR(64) NOT NULL UNIQUE,
        origin_branch_id VARCHAR(64) NOT NULL,
        destination_branch_id VARCHAR(64) NOT NULL,
        current_branch_id VARCHAR(64) NOT NULL,
        sender JSONB NOT NULL,
        receiver JSONB NOT NULL,
        package_info JSONB NOT NULL,
        financials JSONB NOT NULL,
        status VARCHAR(64) NOT NULL DEFAULT 'booked',
        status_history JSONB NOT NULL DEFAULT '[]'::jsonb,
        is_customer_prebooked BOOLEAN DEFAULT FALSE,
        customer_user_id VARCHAR(64),
        transportation_fee NUMERIC(12,2) DEFAULT 0,
        dest_branch_commission NUMERIC(12,2) DEFAULT 0,
        origin_remittance_due NUMERIC(12,2) DEFAULT 0,
        remittance_status VARCHAR(32) DEFAULT 'pending',
        booked_at TIMESTAMPTZ DEFAULT NOW(),
        estimated_delivery TIMESTAMPTZ,
        actual_delivery TIMESTAMPTZ,
        pod_signature TEXT,
        receiver_id_proof TEXT,
        delivery_notes TEXT,
        booked_by_user_id VARCHAR(64),
        booked_by_user_name VARCHAR(128),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 4. Create Branch Expenses Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS branch_expenses (
        id VARCHAR(64) PRIMARY KEY,
        branch_id VARCHAR(64) NOT NULL,
        category VARCHAR(64) NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        description TEXT NOT NULL,
        expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
        paid_to VARCHAR(128),
        receipt_number VARCHAR(64),
        created_by_name VARCHAR(128) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 5. Create Branch Settlements Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS branch_settlements (
        id VARCHAR(64) PRIMARY KEY,
        shipment_id VARCHAR(64),
        cn_number VARCHAR(64) NOT NULL,
        origin_branch_id VARCHAR(64) NOT NULL,
        destination_branch_id VARCHAR(64) NOT NULL,
        gross_collected_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
        dest_branch_commission NUMERIC(12,2) NOT NULL DEFAULT 100,
        net_remitted_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
        settlement_channel VARCHAR(64) DEFAULT 'sarafi_hawala',
        sarafi_reference_no VARCHAR(128),
        settlement_status VARCHAR(32) DEFAULT 'settled',
        settled_by_user_name VARCHAR(128) DEFAULT 'Branch Cashier',
        settled_at TIMESTAMPTZ DEFAULT NOW(),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 6. Create Branch Revenue Snapshots Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS branch_revenue_snapshots (
        id VARCHAR(64) PRIMARY KEY,
        branch_id VARCHAR(64) NOT NULL,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        gross_freight_revenue NUMERIC(14,2) DEFAULT 0,
        origin_bookings_revenue NUMERIC(14,2) DEFAULT 0,
        dest_cod_collected NUMERIC(14,2) DEFAULT 0,
        dest_commissions_retained NUMERIC(14,2) DEFAULT 0,
        total_operating_expenses NUMERIC(14,2) DEFAULT 0,
        net_profit NUMERIC(14,2) DEFAULT 0,
        profit_margin_percent NUMERIC(6,2) DEFAULT 0,
        total_dispatched_volume INT DEFAULT 0,
        total_received_volume INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create Indexes
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_shipments_cn ON shipments (cn_number);
      CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments (status);
      CREATE INDEX IF NOT EXISTS idx_shipments_origin ON shipments (origin_branch_id);
      CREATE INDEX IF NOT EXISTS idx_shipments_destination ON shipments (destination_branch_id);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
      CREATE INDEX IF NOT EXISTS idx_branches_code ON branches (code);
      CREATE INDEX IF NOT EXISTS idx_expenses_branch ON branch_expenses (branch_id);
      CREATE INDEX IF NOT EXISTS idx_settlements_cn ON branch_settlements (cn_number);
      CREATE INDEX IF NOT EXISTS idx_settlements_origin ON branch_settlements (origin_branch_id);
      CREATE INDEX IF NOT EXISTS idx_settlements_dest ON branch_settlements (destination_branch_id);
    `);

    // Seed Branches if empty
    const { rows: branchRows } = await db.query(`SELECT COUNT(*) as count FROM branches`);
    if (parseInt(branchRows[0].count, 10) === 0 && initialBranches.length > 0) {
      console.log('🌱 Seeding initial branches into Supabase PostgreSQL...');
      for (const b of initialBranches) {
        await db.query(
          `INSERT INTO branches (
            id, name, name_fa, name_ps, code, province, city, address, phone, email, 
            manager_name, is_head_office, active_shipments_count, total_parcels_dispatched, 
            total_parcels_received, total_revenue_afn, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          ON CONFLICT (id) DO NOTHING`,
          [
            b.id, b.name, b.nameFa, b.namePs, b.code, b.province, b.city, b.address, b.phone,
            b.email, b.managerName, b.isHeadOffice, b.activeShipmentsCount || 0,
            b.totalParcelsDispatched || 0, b.totalParcelsReceived || 0, b.totalRevenueAfn || 0,
            b.createdAt || new Date().toISOString()
          ]
        );
      }
    }

    // Seed Users if empty
    const { rows: userRows } = await db.query(`SELECT COUNT(*) as count FROM users`);
    if (parseInt(userRows[0].count, 10) === 0 && initialUsers.length > 0) {
      console.log('🌱 Seeding initial users into Supabase PostgreSQL...');
      for (const u of initialUsers) {
        await db.query(
          `INSERT INTO users (
            id, name, email, phone, role, branch_id, password, password_changed_by_branch, 
            last_password_change, status, avatar, created_at, last_login
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO NOTHING`,
          [
            u.id, u.name, u.email, u.phone, u.role, u.branchId, u.password || 'kabul123',
            u.passwordChangedByBranch || false, u.lastPasswordChange || null,
            u.status || 'active', u.avatar || null, u.createdAt || new Date().toISOString(),
            u.lastLogin || null
          ]
        );
      }
    }

    // Seed Shipments if empty
    const { rows: shipmentRows } = await db.query(`SELECT COUNT(*) as count FROM shipments`);
    if (parseInt(shipmentRows[0].count, 10) === 0 && initialShipments.length > 0) {
      console.log('🌱 Seeding initial shipments into Supabase PostgreSQL...');
      for (const s of initialShipments) {
        await db.query(
          `INSERT INTO shipments (
            id, cn_number, origin_branch_id, destination_branch_id, current_branch_id, 
            sender, receiver, package_info, financials, status, status_history, booked_at, 
            estimated_delivery, actual_delivery, pod_signature, receiver_id_proof, delivery_notes, 
            booked_by_user_id, booked_by_user_name
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
          ON CONFLICT (id) DO NOTHING`,
          [
            s.id, s.cnNumber, s.originBranchId, s.destinationBranchId, s.currentBranchId,
            JSON.stringify(s.sender), JSON.stringify(s.receiver), JSON.stringify(s.packageInfo),
            JSON.stringify(s.financials), s.status, JSON.stringify(s.statusHistory || []),
            s.bookedAt, s.estimatedDelivery, s.actualDelivery || null, s.podSignature || null,
            s.receiverIdProof || null, s.deliveryNotes || null, s.bookedByUserId, s.bookedByUserName
          ]
        );
      }
    }

    console.log('✅ Supabase PostgreSQL Database Initialized Successfully!');
    return { success: true };
  } catch (error) {
    console.error('❌ Supabase PostgreSQL initialization error:', error);
    return { success: false, error };
  }
}
