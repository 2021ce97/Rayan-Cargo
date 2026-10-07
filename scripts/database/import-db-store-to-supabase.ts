import { config as loadEnv } from 'dotenv';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';

type Row = Record<string, any>;
loadEnv({ override: true, quiet: true });
if (!process.argv[2]) {
  throw new Error('Provide the path to a database export JSON file.');
}
const sourcePath = resolve(process.argv[2]);
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');

function unpack(input: unknown): Row[] {
  if (!Array.isArray(input)) return [];
  return input.map((entry: any) => Array.isArray(entry) && entry.length >= 2 ? entry[1] : entry);
}
function pick(row: Row, snake: string, camel: string = snake): any {
  return row[snake] ?? row[camel];
}
function numeric(input: unknown): number | null {
  if (input === null || input === undefined || input === '') return null;
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : null;
}

const sourceText = await readFile(sourcePath, 'utf8');
const source = JSON.parse(sourceText);
const checksum = createHash('sha256').update(sourceText).digest('hex');
const branches = unpack(source.branches);
const users = unpack(source.users);
const shipments = unpack(source.shipments);
const expenses = unpack(source.branch_expenses);
const settlements = unpack(source.branch_settlements);
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
  connectionTimeoutMillis: 30_000,
  idleTimeoutMillis: 0
});
pool.on('error', (error) => {
  console.error('Supabase pool connection error:', error.message);
});
const db = await pool.connect();
db.on('error', (error) => {
  console.error('Supabase import connection error:', error.message);
});
let runId = '';
const counts = { branches: 0, superAdmins: 0, staffUsers: 0, shipments: 0, statusEvents: 0, expenses: 0, settlements: 0, rejected: 0 };
const shipmentEvents: Row[] = [];

async function reject(table: string, row: Row, reason: string) {
  await db.query(
    "INSERT INTO public.import_rejections(import_run_id,source_table,source_record_id,reason,source_payload) VALUES($1,$2,$3,$4,$5::jsonb) ON CONFLICT(import_run_id,source_table,source_record_id) DO UPDATE SET reason=excluded.reason,source_payload=excluded.source_payload",
    [runId, table, String(row.id || ''), reason, JSON.stringify(row)]
  );
  counts.rejected++;
}

try {
  await db.query('BEGIN');
  const run = await db.query(
    'INSERT INTO public.import_runs(source_name,source_checksum) VALUES($1,$2) RETURNING id',
    [sourcePath, checksum]
  );
  runId = run.rows[0].id;

  for (const b of branches) {
    await db.query(
      "INSERT INTO public.branches(id,name,name_fa,name_ps,code,province,city,address,phone,email,manager_name,tazkira_number,is_head_office,active_shipments_count,total_parcels_dispatched,total_parcels_received,total_revenue_afn,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) ON CONFLICT(id) DO UPDATE SET name=excluded.name,name_fa=excluded.name_fa,name_ps=excluded.name_ps,code=excluded.code,province=excluded.province,city=excluded.city,address=excluded.address,phone=excluded.phone,email=excluded.email,manager_name=excluded.manager_name,tazkira_number=excluded.tazkira_number,is_head_office=excluded.is_head_office,active_shipments_count=excluded.active_shipments_count,total_parcels_dispatched=excluded.total_parcels_dispatched,total_parcels_received=excluded.total_parcels_received,total_revenue_afn=excluded.total_revenue_afn",
      [b.id,b.name,pick(b,'name_fa','nameFa')||b.name,pick(b,'name_ps','namePs')||b.name,b.code,b.province,b.city,b.address,b.phone,b.email,b.manager_name||b.managerName,b.tazkira_number||b.tazkiraNumber||null,!!pick(b,'is_head_office','isHeadOffice'),numeric(pick(b,'active_shipments_count','activeShipmentsCount'))||0,numeric(pick(b,'total_parcels_dispatched','totalParcelsDispatched'))||0,numeric(pick(b,'total_parcels_received','totalParcelsReceived'))||0,numeric(pick(b,'total_revenue_afn','totalRevenueAfn'))||0,b.created_at||b.createdAt||new Date().toISOString()]
    );
    counts.branches++;
  }

  for (const u of users) {
    if (u.role === 'super_admin') {
      const auth = await db.query('SELECT id FROM auth.users WHERE lower(email)=lower($1) LIMIT 1', [u.email]);
      if (!auth.rowCount) {
        await reject('users', u, 'No matching Supabase Auth user. Create it with this email and rerun.');
        continue;
      }
      await db.query(
        "INSERT INTO public.super_admin_profiles(auth_user_id,legacy_user_id,name,email,phone,status,avatar,preferences,created_at) VALUES($1,$2,$3,lower($4),$5,$6,$7,$8::jsonb,$9) ON CONFLICT(auth_user_id) DO UPDATE SET legacy_user_id=excluded.legacy_user_id,name=excluded.name,email=excluded.email,phone=excluded.phone,status=excluded.status,avatar=excluded.avatar,preferences=excluded.preferences",
        [auth.rows[0].id,u.id,u.name,u.email,u.phone,u.status||'active',u.avatar||null,JSON.stringify(u.preferences||{}),u.created_at||new Date().toISOString()]
      );
      counts.superAdmins++;
      continue;
    }
    if (!u.password) {
      await reject('users', u, 'Non-Super-Admin user has no password to hash.');
      continue;
    }
    await db.query(
      "INSERT INTO public.staff_users(id,branch_id,name,email,phone,role,password_hash,password_changed_by_branch,last_password_change,status,avatar,preferences,created_at) VALUES($1,$2,$3,lower($4),$5,$6,crypt($7,gen_salt('bf',12)),$8,$9,$10,$11,$12::jsonb,$13) ON CONFLICT(id) DO UPDATE SET branch_id=excluded.branch_id,name=excluded.name,email=excluded.email,phone=excluded.phone,role=excluded.role,password_hash=excluded.password_hash,password_changed_by_branch=excluded.password_changed_by_branch,last_password_change=excluded.last_password_change,status=excluded.status,avatar=excluded.avatar,preferences=excluded.preferences",
      [u.id,u.branch_id==='customer'?null:u.branch_id,u.name,u.email,u.phone,u.role,u.password,!!u.password_changed_by_branch,u.last_password_change||null,u.status||'active',u.avatar||null,JSON.stringify(u.preferences||{}),u.created_at||new Date().toISOString()]
    );
    counts.staffUsers++;
  }

  for (const s of shipments) {
    await db.query(
      "INSERT INTO public.shipments(id,cn_number,origin_branch_id,destination_branch_id,current_branch_id,sender,receiver,package_info,financials,status,status_history,booked_at,estimated_delivery,actual_delivery,pod_signature,receiver_id_proof,delivery_notes,booked_by_user_id,booked_by_user_name,dest_branch_commission,remittance_status,origin_remittance_due,is_pre_booking,is_customer_prebooked,customer_user_id,print_count,last_printed_at,last_printed_by,created_at) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10,$11::jsonb,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29) ON CONFLICT(id) DO UPDATE SET cn_number=excluded.cn_number,origin_branch_id=excluded.origin_branch_id,destination_branch_id=excluded.destination_branch_id,current_branch_id=excluded.current_branch_id,sender=excluded.sender,receiver=excluded.receiver,package_info=excluded.package_info,financials=excluded.financials,status=excluded.status,status_history=excluded.status_history,estimated_delivery=excluded.estimated_delivery,actual_delivery=excluded.actual_delivery,delivery_notes=excluded.delivery_notes,dest_branch_commission=excluded.dest_branch_commission,remittance_status=excluded.remittance_status,origin_remittance_due=excluded.origin_remittance_due",
      [s.id,s.cn_number,s.origin_branch_id,s.destination_branch_id,s.current_branch_id,JSON.stringify(s.sender),JSON.stringify(s.receiver),JSON.stringify(s.package_info),JSON.stringify(s.financials),s.status,JSON.stringify(s.status_history||[]),s.booked_at,s.estimated_delivery||null,s.actual_delivery||null,s.pod_signature||null,s.receiver_id_proof||null,s.delivery_notes||'',s.booked_by_user_id||null,s.booked_by_user_name||null,numeric(s.dest_branch_commission)||0,s.remittance_status||'pending',numeric(s.origin_remittance_due)||0,!!s.is_pre_booking,!!s.is_customer_prebooked,s.customer_user_id||null,numeric(s.print_count)||0,s.last_printed_at||null,s.last_printed_by||null,s.created_at||s.booked_at]
    );
    counts.shipments++;
    for (const event of s.status_history || []) {
      shipmentEvents.push({
        id: event.id,
        shipment_id: s.id,
        status: event.status,
        location: event.location || '',
        branch_name: event.branchName || '',
        occurred_at: event.timestamp,
        note: event.note || '',
        updated_by: event.updatedBy || '',
        driver_name: event.driverName || null,
        driver_phone: event.driverPhone || null
      });
    }
  }

  if (shipmentEvents.length) {
    await db.query(
      "INSERT INTO public.shipment_status_events(id,shipment_id,status,location,branch_name,occurred_at,note,updated_by,driver_name,driver_phone) SELECT e.id,e.shipment_id,e.status,e.location,e.branch_name,e.occurred_at,e.note,e.updated_by,e.driver_name,e.driver_phone FROM jsonb_to_recordset($1::jsonb) AS e(id text,shipment_id text,status text,location text,branch_name text,occurred_at timestamptz,note text,updated_by text,driver_name text,driver_phone text) ON CONFLICT(id) DO UPDATE SET status=excluded.status,location=excluded.location,branch_name=excluded.branch_name,occurred_at=excluded.occurred_at,note=excluded.note,updated_by=excluded.updated_by,driver_name=excluded.driver_name,driver_phone=excluded.driver_phone",
      [JSON.stringify(shipmentEvents)]
    );
    counts.statusEvents = shipmentEvents.length;
  }

  const branchIds = new Set(branches.map(b => b.id));
  for (const e of expenses) {
    const amount = numeric(e.amount);
    const branchId = pick(e,'branch_id','branchId');
    const problems = [amount===null?'invalid numeric amount':'',!branchId||!branchIds.has(branchId)?'missing or unknown branch_id':'',!e.description?'missing description':''].filter(Boolean);
    if (problems.length) {
      await reject('branch_expenses', e, problems.join('; '));
      continue;
    }
    await db.query(
      "INSERT INTO public.branch_expenses(id,branch_id,category,amount,description,expense_date,paid_to,receipt_number,created_by_name,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(id) DO UPDATE SET branch_id=excluded.branch_id,category=excluded.category,amount=excluded.amount,description=excluded.description,expense_date=excluded.expense_date,paid_to=excluded.paid_to,receipt_number=excluded.receipt_number",
      [e.id,branchId,e.category,amount,e.description,e.expense_date,e.paid_to||null,e.receipt_number||null,e.created_by_name||'Unknown',e.created_at||new Date().toISOString()]
    );
    counts.expenses++;
  }

  for (const s of settlements) {
    await db.query(
      "INSERT INTO public.branch_settlements(id,branch_id,cn_number,origin_branch_id,destination_branch_id,gross_collected_amount,dest_branch_commission,net_remitted_amount,settlement_channel,settlement_status,settled_by_user_name,settled_at,notes,created_at,parcel_ids) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb) ON CONFLICT(id) DO NOTHING",
      [s.id,s.branch_id||s.fromBranchId||'br_admin_hq',s.cn_number||s.batchNumber||('REM-'+s.id),s.origin_branch_id||s.originBranchId||'br_admin_hq',s.destination_branch_id||s.destinationBranchId||s.fromBranchId||'br_admin_hq',numeric(s.gross_collected_amount||s.totalCollectedAfn)||0,numeric(s.dest_branch_commission||s.destCommissionAfn)||0,numeric(s.net_remitted_amount||s.netRemittanceAmountAfn)||0,s.settlement_channel||s.paymentMethod||'sarafi_hawala',s.settlement_status||s.status||'settled',s.settled_by_user_name||s.submittedByUserName||'Unknown',s.settled_at||s.submittedAt||new Date().toISOString(),s.notes||null,s.created_at||s.submittedAt||new Date().toISOString(),JSON.stringify(s.parcel_ids||s.parcelIds||[])]
    );
    counts.settlements++;
  }

  await db.query("UPDATE public.import_runs SET status='completed',imported_counts=$2::jsonb,completed_at=now() WHERE id=$1", [runId,JSON.stringify(counts)]);
  await db.query('COMMIT');
  console.log(JSON.stringify({ importRunId: runId, checksum, counts }, null, 2));
} catch (error: any) {
  await db.query('ROLLBACK').catch(() => undefined);
  console.error(error?.message || error);
  process.exitCode = 1;
} finally {
  db.release();
  await pool.end();
}
