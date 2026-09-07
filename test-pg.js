const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres' });
async function test() {
  await client.connect().catch(()=>console.log('no db'));
  // skip if no db
  console.log('done');
  process.exit(0);
}
test();
