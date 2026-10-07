const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log('[PASS]', message);
    passed += 1;
    return;
  }
  console.error('[FAIL]', message);
  failed += 1;
}

async function getJson(path: string) {
  const response = await fetch(baseUrl + path);
  const body = await response.json();
  return { response, body };
}

async function run() {
  console.log('Running read-only system checks against', baseUrl);

  const health = await getJson('/api/health');
  assert(health.response.ok, 'Health endpoint returns HTTP 200');
  assert(health.body.connected === true, 'Supabase PostgreSQL is connected');
  assert(Number(health.body.stats?.branches) > 0, 'Database contains branches');
  assert(Number(health.body.stats?.users) > 0, 'Database contains users');

  assert(
    health.response.headers.get('x-content-type-options') === 'nosniff',
    'X-Content-Type-Options is configured'
  );
  assert(
    health.response.headers.get('x-frame-options') === 'SAMEORIGIN',
    'X-Frame-Options is configured'
  );
  assert(
    health.response.headers.get('referrer-policy') === 'strict-origin-when-cross-origin',
    'Referrer-Policy is configured'
  );

  const invalidTracking = await fetch(baseUrl + '/api/track/%27%20OR%201%3D1--');
  assert(
    invalidTracking.status === 400 || invalidTracking.status === 404,
    'Invalid tracking input is rejected safely'
  );

  console.log('Results:', passed, 'passed,', failed, 'failed');
  if (failed > 0) process.exitCode = 1;
}

run().catch((error) => {
  console.error('System checks could not complete:', error);
  process.exitCode = 1;
});
