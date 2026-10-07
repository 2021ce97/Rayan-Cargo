import pg from 'pg';
import { randomUUID } from 'node:crypto';

export const DEFAULT_SUPABASE_DATABASE_URL = '';
export const SUPABASE_SCHEMA_SQL =
  'Apply supabase/migrations/20261007010000_refactor_database.sql using the Supabase SQL Editor or CLI.';

let pool: pg.Pool | null = null;

export function sanitizeConnectionString(url?: string): string {
  if (!url) return '';
  const clean = url.trim();
  if (!/^postgres(?:ql)?:\/\//i.test(clean)) {
    throw new Error('DATABASE_URL must be a PostgreSQL connection URL.');
  }
  return clean;
}

function createPool(connectionString: string): pg.Pool {
  return new pg.Pool({
    connectionString: sanitizeConnectionString(connectionString),
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000
  });
}

export function getDbPool(): pg.Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required. Local database fallback has been removed.');
  }
  if (!pool) pool = createPool(connectionString);
  return pool;
}

export async function initDatabase(): Promise<void> {
  await getDbPool().query('SELECT 1');
  console.log('Supabase PostgreSQL database connected.');
}

export function getDatabaseInfo() {
  return {
    connected: Boolean(process.env.DATABASE_URL),
    database: 'Supabase PostgreSQL',
    mode: 'supabase-only',
    persistent: true
  };
}

export async function connectToSupabase(connectionString: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const candidate = createPool(connectionString);
  try {
    await candidate.query('SELECT NOW()');
    if (pool) await pool.end();
    pool = candidate;
    process.env.DATABASE_URL = sanitizeConnectionString(connectionString);
    return { success: true, message: 'Connected to Supabase PostgreSQL.' };
  } catch (error: any) {
    await candidate.end().catch(() => undefined);
    return { success: false, error: error?.message || 'Supabase connection failed.' };
  }
}

export async function withTransaction<T>(callback: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await getDbPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function wipeDatabaseClean(): Promise<{ success: boolean; error?: any }> {
  try {
    await withTransaction(async (client) => {
      await client.query('DELETE FROM public.shipment_status_events');
      await client.query('DELETE FROM public.branch_settlements');
      await client.query('DELETE FROM public.branch_expenses');
      await client.query('DELETE FROM public.shipments');
      await client.query('UPDATE public.branches SET active_shipments_count=0,total_parcels_dispatched=0,total_parcels_received=0,total_revenue_afn=0');
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || error };
  }
}

export async function syncAllDataToStore(payload: {
  branches?: any[];
  users?: any[];
  shipments?: any[];
  expenses?: any[];
  settlements?: any[];
}): Promise<{ success: boolean; stats: Record<string, number> }> {
  const stats = { branches: 0, users: 0, shipments: 0, expenses: 0, settlements: 0 };
  await withTransaction(async (client) => {
    for (const b of payload.branches || []) {
      await client.query(
        'INSERT INTO public.branches(id,name,name_fa,name_ps,code,province,city,address,phone,email,manager_name,tazkira_number,is_head_office,active_shipments_count,total_parcels_dispatched,total_parcels_received,total_revenue_afn,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) ON CONFLICT(id) DO UPDATE SET name=excluded.name,name_fa=excluded.name_fa,name_ps=excluded.name_ps,code=excluded.code,province=excluded.province,city=excluded.city,address=excluded.address,phone=excluded.phone,email=excluded.email,manager_name=excluded.manager_name,tazkira_number=excluded.tazkira_number,is_head_office=excluded.is_head_office',
        [b.id,b.name,b.nameFa||b.name_fa||b.name,b.namePs||b.name_ps||b.name,b.code,b.province,b.city,b.address,b.phone,b.email,b.managerName||b.manager_name,b.tazkiraNumber||b.tazkira_number||null,!!(b.isHeadOffice??b.is_head_office),b.activeShipmentsCount||0,b.totalParcelsDispatched||0,b.totalParcelsReceived||0,b.totalRevenueAfn||0,b.createdAt||new Date().toISOString()]
      );
      stats.branches++;
    }
    for (const u of payload.users || []) {
      if (u.role === 'super_admin') continue;
      await client.query(
        "INSERT INTO public.staff_users(id,branch_id,name,email,phone,role,password_hash,status,created_at) VALUES($1,$2,$3,lower($4),$5,$6,crypt($7,gen_salt('bf',12)),$8,$9) ON CONFLICT(id) DO UPDATE SET branch_id=excluded.branch_id,name=excluded.name,email=excluded.email,phone=excluded.phone,role=excluded.role,status=excluded.status",
        [u.id,u.role==='customer'?null:(u.branchId||u.branch_id),u.name,u.email,u.phone,u.role,u.password||randomUUID(),u.status||'active',u.createdAt||new Date().toISOString()]
      );
      stats.users++;
    }
    for (const s of payload.shipments || []) {
      await client.query(
        'INSERT INTO public.shipments(id,cn_number,origin_branch_id,destination_branch_id,current_branch_id,sender,receiver,package_info,financials,status,status_history,booked_at,estimated_delivery,actual_delivery,delivery_notes,booked_by_user_id,booked_by_user_name,dest_branch_commission,remittance_status,origin_remittance_due,is_pre_booking,is_customer_prebooked,customer_user_id,created_at) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10,$11::jsonb,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24) ON CONFLICT(id) DO UPDATE SET current_branch_id=excluded.current_branch_id,sender=excluded.sender,receiver=excluded.receiver,package_info=excluded.package_info,financials=excluded.financials,status=excluded.status,status_history=excluded.status_history,actual_delivery=excluded.actual_delivery,delivery_notes=excluded.delivery_notes,remittance_status=excluded.remittance_status',
        [s.id,s.cnNumber||s.cn_number,s.originBranchId||s.origin_branch_id,s.destinationBranchId||s.destination_branch_id,s.currentBranchId||s.current_branch_id,JSON.stringify(s.sender),JSON.stringify(s.receiver),JSON.stringify(s.packageInfo||s.package_info),JSON.stringify(s.financials),s.status,JSON.stringify(s.statusHistory||s.status_history||[]),s.bookedAt||s.booked_at,s.estimatedDelivery||s.estimated_delivery||null,s.actualDelivery||s.actual_delivery||null,s.deliveryNotes||s.delivery_notes||'',s.bookedByUserId||s.booked_by_user_id||null,s.bookedByUserName||s.booked_by_user_name||null,s.destBranchCommission||s.dest_branch_commission||0,s.remittanceStatus||s.remittance_status||'pending',s.originRemittanceDue||s.origin_remittance_due||0,!!(s.isPreBooking??s.is_pre_booking),!!(s.isCustomerPrebooked??s.is_customer_prebooked),s.customerUserId||s.customer_user_id||null,s.createdAt||s.created_at||s.bookedAt||new Date().toISOString()]
      );
      stats.shipments++;
    }
  });
  return { success: true, stats };
}
