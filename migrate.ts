import { getDbPool } from './src/server/db';

async function run() {
  const pool = getDbPool();
  try {
    console.log('Running migration...');
    await pool.query(`ALTER TABLE branch_settlements ADD COLUMN IF NOT EXISTS parcel_ids JSONB;`);
    console.log('Added parcel_ids.');
    await pool.query(`ALTER TABLE shipments DROP CONSTRAINT IF EXISTS shipments_remittance_status_check;`);
    console.log('Dropped check constraint on remittance_status.');
    console.log('Migration completed.');
  } catch(e) {
    console.error(e);
  }
}
run();
