import { getDbPool } from './src/server/db';

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required. Set it to your Supabase Session Pooler connection string before running this migration.');
  }
  const pool = getDbPool();
  try {
    console.log('Running migration...');
    await pool.query('BEGIN');
    await pool.query(`
      UPDATE shipments SET origin_branch_id = 'br_admin_hq' WHERE origin_branch_id = 'br_kbl_01';
      UPDATE shipments SET destination_branch_id = 'br_admin_hq' WHERE destination_branch_id = 'br_kbl_01';
      UPDATE shipments SET current_branch_id = 'br_admin_hq' WHERE current_branch_id = 'br_kbl_01';
      UPDATE branch_expenses SET branch_id = 'br_admin_hq' WHERE branch_id = 'br_kbl_01';
      UPDATE branch_settlements SET origin_branch_id = 'br_admin_hq' WHERE origin_branch_id = 'br_kbl_01';
      UPDATE branch_settlements SET destination_branch_id = 'br_admin_hq' WHERE destination_branch_id = 'br_kbl_01';
      UPDATE branch_settlements SET branch_id = 'br_admin_hq' WHERE branch_id = 'br_kbl_01';
      DELETE FROM users WHERE id IN ('usr_kbl_01', 'usr_kbl_mgr') OR branch_id = 'br_kbl_01';
      DELETE FROM branches WHERE id = 'br_kbl_01' OR code = 'KBL-01';
    `);
    await pool.query(`ALTER TABLE branch_settlements ADD COLUMN IF NOT EXISTS parcel_ids JSONB DEFAULT '[]'::jsonb;`);
    await pool.query(`ALTER TABLE shipments ADD COLUMN IF NOT EXISTS customer_submission_at TIMESTAMPTZ;`);
    await pool.query(`ALTER TABLE shipments ADD COLUMN IF NOT EXISTS customer_submission_reference VARCHAR(128);`);
    await pool.query(`ALTER TABLE shipments ADD COLUMN IF NOT EXISTS customer_submission_by VARCHAR(128);`);
    await pool.query(`ALTER TABLE shipments DROP CONSTRAINT IF EXISTS shipments_remittance_status_check;`);
    await pool.query(`ALTER TABLE shipments ADD CONSTRAINT shipments_remittance_status_check CHECK (remittance_status IN ('pending', 'submitted_to_headoffice', 'settled', 'not_applicable'));`);
    await pool.query('COMMIT');
    console.log('Migration completed.');
  } catch(e) {
    await pool.query('ROLLBACK');
    console.error(e);
    process.exitCode = 1;
  }
}
run();
