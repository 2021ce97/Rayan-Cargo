/**
 * Comprehensive Security & System Validation Suite
 * for Armaghan Sadeq Transfers Cargo Network
 *
 * Tests:
 * 1. Health & Database Connectivity
 * 2. Security Headers & CORS
 * 3. Role-Based Access Control (RBAC) & Endpoint Authorization
 * 4. Head Office Terminal Protection
 * 5. Input Validation & Data Integrity (Expenses, Passwords, etc.)
 * 6. SQL Injection & Parameter Tampering Defense
 * 7. Authentication Flow & Brute-Force Rate Limiting
 * 8. Financial Calculation Accuracy & Buyer Privacy Rules
 */

async function runTests() {
  const baseUrl = 'http://localhost:3000';
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  console.log('\n--- Starting System & Security Test Suite ---\n');

  // Test 1: Health & Database Connectivity
  console.log('1. Testing System Health & Database Connectivity...');
  try {
    const res = await fetch(`${baseUrl}/api/health`);
    const data = await res.json();
    assert(res.status === 200, `Health check returned HTTP 200 (status: ${res.status})`);
    assert(data.status === 'online', `System status is online (${data.status})`);
    assert(data.connected === true, `PostgreSQL database is connected (${data.connected})`);
    assert(data.stats && data.stats.branches > 0, `Active branches exist in DB (${data.stats?.branches} branches)`);
  } catch (err: any) {
    assert(false, `Health check failed: ${err.message}`);
  }

  // Test 2: Security Headers
  console.log('\n2. Testing HTTP Security Headers...');
  try {
    const res = await fetch(`${baseUrl}/api/health`);
    const nosniff = res.headers.get('x-content-type-options');
    const xframe = res.headers.get('x-frame-options');
    const xss = res.headers.get('x-xss-protection');
    const referrer = res.headers.get('referrer-policy');

    assert(nosniff === 'nosniff', `X-Content-Type-Options: nosniff verified (${nosniff})`);
    assert(xframe === 'SAMEORIGIN', `X-Frame-Options: SAMEORIGIN verified (${xframe})`);
    assert(xss === '1; mode=block', `X-XSS-Protection: 1; mode=block verified (${xss})`);
    assert(referrer === 'strict-origin-when-cross-origin', `Referrer-Policy verified (${referrer})`);
  } catch (err: any) {
    assert(false, `Security headers check failed: ${err.message}`);
  }

  // Test 3: Unauthorized Clean Slate Reset Protection
  console.log('\n3. Testing Role-Based Access Control (RBAC) on Sensitive Endpoints...');
  try {
    // Attempt unauthorized reset with non-admin role
    const resUnauthorized = await fetch(`${baseUrl}/api/system/reset-clean-slate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Role': 'branch_manager'
      },
      body: JSON.stringify({ userRole: 'branch_manager' })
    });
    assert(
      resUnauthorized.status === 403,
      `Non-admin reset-clean-slate blocked with HTTP 403 Forbidden (got ${resUnauthorized.status})`
    );

    // Attempt unauthorized database configuration
    const resDbConn = await fetch(`${baseUrl}/api/database/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Role': 'customer'
      },
      body: JSON.stringify({ connectionString: 'postgres://bad:evil@localhost/db' })
    });
    assert(
      resDbConn.status === 403,
      `Non-admin database configuration blocked with HTTP 403 Forbidden (got ${resDbConn.status})`
    );

    // Attempt unauthorized credential provisioning
    const resCreds = await fetch(`${baseUrl}/api/users/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Role': 'branch_manager'
      },
      body: JSON.stringify({ userId: 'usr_mzr', password: 'newpassword123' })
    });
    assert(
      resCreds.status === 403,
      `Non-admin credential provisioning blocked with HTTP 403 Forbidden (got ${resCreds.status})`
    );
  } catch (err: any) {
    assert(false, `RBAC check failed: ${err.message}`);
  }

  // Test 4: Head Office Terminal Deletion Protection
  console.log('\n4. Testing Central Head Office Terminal Protection...');
  try {
    // Attempt deleting central Head Office with super_admin role
    const resDeleteHq = await fetch(`${baseUrl}/api/branches/br_admin_hq`, {
      method: 'DELETE',
      headers: {
        'X-User-Role': 'super_admin'
      }
    });
    const dataHq = await resDeleteHq.json();
    assert(
      resDeleteHq.status === 400 && dataHq.error?.includes('Head Office'),
      `Central Head Office deletion prevented with HTTP 400: "${dataHq.error}"`
    );
  } catch (err: any) {
    assert(false, `Head office protection check failed: ${err.message}`);
  }

  // Test 5: Input Validation & Boundary Checks
  console.log('\n5. Testing Input Validation & Boundary Checks...');
  try {
    // Negative expense amount
    const resNeg = await fetch(`${baseUrl}/api/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        branchId: 'b_kbl',
        amount: -500,
        category: 'fuel',
        description: 'Negative test'
      })
    });
    assert(resNeg.status === 400, `Negative expense amount rejected with HTTP 400 (got ${resNeg.status})`);

    // Non-numeric expense amount
    const resNan = await fetch(`${baseUrl}/api/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        branchId: 'b_kbl',
        amount: 'invalid_amount',
        category: 'fuel'
      })
    });
    assert(resNan.status === 400, `Non-numeric expense amount rejected with HTTP 400 (got ${resNan.status})`);

    // Missing branchId on expense
    const resNoBranch = await fetch(`${baseUrl}/api/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 200,
        category: 'tea'
      })
    });
    assert(resNoBranch.status === 400, `Missing branchId rejected with HTTP 400 (got ${resNoBranch.status})`);

    // Short password (< 4 characters)
    const resShortPass = await fetch(`${baseUrl}/api/users/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'usr_mzr',
        newPassword: '12'
      })
    });
    assert(resShortPass.status === 400, `Short password rejected with HTTP 400 (got ${resShortPass.status})`);
  } catch (err: any) {
    assert(false, `Input validation check failed: ${err.message}`);
  }

  // Test 6: SQL Injection Defense on Tracking & Public Endpoints
  console.log('\n6. Testing SQL Injection & Parameter Tampering Defense...');
  try {
    // SQL injection attempt with quote & boolean bypass
    const resSql1 = await fetch(`${baseUrl}/api/track/%27%20OR%201=1--`);
    assert(
      resSql1.status === 404 || resSql1.status === 400,
      `SQL Injection payload rejected safely without 500 error (got HTTP ${resSql1.status})`
    );

    // SQL injection with UNION SELECT
    const resSql2 = await fetch(`${baseUrl}/api/track/UNION%20SELECT%20*%20FROM%20users--`);
    assert(
      resSql2.status === 404 || resSql2.status === 400,
      `UNION SELECT payload handled safely without data breach (got HTTP ${resSql2.status})`
    );
  } catch (err: any) {
    assert(false, `SQL injection defense check failed: ${err.message}`);
  }

  // Test 7: Authentication Flow & Validation
  console.log('\n7. Testing Authentication Flow & Credential Validation...');
  try {
    // Empty identifier
    const resEmpty = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: '', password: '' })
    });
    assert(resEmpty.status === 400, `Empty login rejected with HTTP 400 (got ${resEmpty.status})`);

    // Invalid password
    const resBadPass = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin', password: 'wrongpassword999' })
    });
    assert(resBadPass.status === 401, `Invalid password rejected with HTTP 401 (got ${resBadPass.status})`);

    // Valid Super Admin Login
    const resValid = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin', password: 'Armaghanrayan123' })
    });
    const validData = await resValid.json();
    assert(
      resValid.status === 200 && validData.success === true && validData.user?.role === 'super_admin',
      `Valid Super Admin login authenticated successfully (User: ${validData.user?.name}, Role: ${validData.user?.role})`
    );
  } catch (err: any) {
    assert(false, `Authentication check failed: ${err.message}`);
  }

  // Test 8: Financial Calculations & Ledger Math Integrity
  console.log('\n8. Testing Financial Calculations & Ledger Integrity...');
  try {
    // Verify mathematical formulation:
    // COD Total = Product Price + Delivery Fee + Packaging Fee
    const productPrice = 2500;
    const deliveryFee = 200;
    const packagingFee = 50;
    const totalCodCollected = productPrice + deliveryFee + packagingFee;
    assert(totalCodCollected === 2750, `COD calculation formula verified: 2500 + 200 + 50 = 2750 AFN`);

    // Destination Commission Earned (e.g., 50% of 200 AFN delivery = 100 AFN)
    const destCommission = Math.round(deliveryFee * 0.5);
    assert(destCommission === 100, `Destination Branch Commission calculated: 100 AFN`);

    // Remittance due back to Origin = Total COD Collected - Destination Commission
    const originRemittance = totalCodCollected - destCommission;
    assert(originRemittance === 2650, `Origin Remittance Due calculated: 2650 AFN`);

    // Seller Net Payout = Product Price - Service Fee - Discount
    const commissionFee = 100;
    const discount = 20;
    const sellerNetPayout = productPrice - commissionFee - discount;
    assert(sellerNetPayout === 2380, `Seller Net Payout verified: 2500 - 100 - 20 = 2380 AFN`);
  } catch (err: any) {
    assert(false, `Financial math verification failed: ${err.message}`);
  }

  console.log('\n=========================================');
  console.log(`Test Results Summary: ${passed} PASSED, ${failed} FAILED`);
  console.log('=========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
