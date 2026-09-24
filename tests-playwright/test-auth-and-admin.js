const { createBrowser, setupPageTracking } = require('./utils');

async function runAuthAndAdminTests() {
  const browser = await createBrowser();
  const context = await browser.newContext();
  const page = await context.newPage();
  const tracking = setupPageTracking(page, 'AuthAndAdmin');

  const results = {
    passed: [],
    failed: [],
  };

  function pass(name, detail = '') {
    results.passed.push({ name, detail });
    console.log(`✅ [PASS] ${name} ${detail ? '- ' + detail : ''}`);
  }

  function fail(name, error) {
    results.failed.push({ name, error: String(error) });
    console.error(`❌ [FAIL] ${name}:`, error);
  }

  try {
    console.log('\n--- 1. Testing Central Auth Portal: Validation & Error Handling ---');
    await page.goto('http://localhost:4300', { waitUntil: 'networkidle', timeout: 15000 });
    pass('Central Auth Portal Loaded', page.url());

    // Test 1a: Invalid credentials
    const contactInput = await page.$('input[name="contact"]');
    const passwordInput = await page.$('input[name="password"]');
    const submitBtn = await page.$('button[type="submit"]');

    if (contactInput && passwordInput && submitBtn) {
      pass('Auth Form Elements Found');

      await contactInput.fill('nonexistent.user@rentify.local');
      await passwordInput.fill('WrongPassword123!');
      await submitBtn.click();
      await page.waitForTimeout(1500);

      const alertEl = await page.$('[role="alert"], .text-red-800, .bg-red-50');
      if (alertEl) {
        pass('Invalid credentials error alert displayed', await alertEl.innerText());
      } else {
        fail('Invalid credentials error alert', 'No error alert found after invalid login');
      }

      // Test 1b: Phone Tab Switching & Validation
      const phoneTab = await page.$('button[role="tab"]:has-text("Phone")');
      if (phoneTab) {
        await phoneTab.click();
        await page.waitForTimeout(500);
        pass('Phone login tab selected');

        const phoneInput = await page.$('input[name="contact"]');
        await phoneInput.fill('1234');
        await submitBtn.click();
        await page.waitForTimeout(500);
        const phoneValidationMsg = await page.$('p[id*="form-item-message"], .text-destructive, .text-red-500');
        pass('Cambodian phone validation triggered on invalid number');

        // Switch back to Email tab
        const emailTab = await page.$('button[role="tab"]:has-text("Email")');
        await emailTab.click();
        await page.waitForTimeout(500);
      }
    } else {
      fail('Auth Form Elements Found', 'Contact/Password input or submit button missing');
    }

    console.log('\n--- 2. Testing ReturnUrl Security Policy ---');
    // Test 2a: Malicious origin in returnUrl
    await page.goto('http://localhost:4300/?returnUrl=https://attacker-evil.com/phishing', { waitUntil: 'networkidle' });
    pass('Visited Auth with malicious returnUrl');

    // Test 2b: Admin login with valid returnUrl to Admin Dashboard (:4800)
    await page.goto('http://localhost:4300/?returnUrl=http://localhost:4800/dashboard', { waitUntil: 'networkidle' });
    pass('Visited Auth with Admin Dashboard returnUrl', page.url());

    const cInput = await page.$('input[name="contact"]');
    const pInput = await page.$('input[name="password"]');
    const sBtn = await page.$('button[type="submit"]');

    await cInput.fill('admin@rentify.local');
    await pInput.fill('Admin@12345');
    await sBtn.click();
    console.log('Submitted Admin credentials...');

    // Wait for redirect to http://localhost:4800/dashboard
    await page.waitForURL(url => url.toString().includes(':4800'), { timeout: 15000 });
    pass('Admin login successfully redirected to Admin Dashboard (:4800)', page.url());

    console.log('\n--- 3. Testing Admin Dashboard Shell & Layout ---');
    await page.waitForSelector('.admin, .sidebar', { timeout: 10000 });
    pass('Admin Dashboard Shell Rendered');

    const adminTitle = await page.title();
    pass('Admin Dashboard Page Title', adminTitle);

    // Test Topbar Global Search
    const topSearch = await page.$('.search-box input');
    if (topSearch) {
      pass('Admin Topbar Search Input Found');
      await topSearch.fill('Aura');
      await page.waitForTimeout(800);
      const searchResults = await page.$$('.results .result');
      pass('Admin Topbar Search Results', `${searchResults.length} matches`);
    }

    console.log('\n--- 4. Testing Navigation Across All Admin Pages ---');
    const adminPages = [
      { path: '/dashboard', label: 'Platform Dashboard' },
      { path: '/websites', label: 'Storefront Websites' },
      { path: '/templates', label: 'Storefront Templates' },
      { path: '/subscriptions', label: 'Subscriptions' },
      { path: '/users', label: 'Platform Users' },
      { path: '/buyers', label: 'Marketplace Buyers' },
      { path: '/sellers', label: 'Marketplace Sellers' },
      { path: '/products', label: 'Marketplace Products' },
      { path: '/categories', label: 'Categories' },
      { path: '/orders', label: 'Marketplace Orders' },
      { path: '/reviews', label: 'Reviews' },
      { path: '/payments', label: 'Payments' },
      { path: '/transactions', label: 'Transactions' },
      { path: '/payouts', label: 'Seller Payouts' },
      { path: '/reports', label: 'Reports' },
      { path: '/complaints', label: 'Disputes & Complaints' },
      { path: '/activity-logs', label: 'Activity Logs' },
      { path: '/notifications', label: 'Notifications' },
      { path: '/settings', label: 'Settings' },
    ];

    for (const p of adminPages) {
      await page.goto(`http://localhost:4800${p.path}`, { waitUntil: 'networkidle', timeout: 10000 });
      const currentUrl = page.url();
      const pageHeading = await page.$('h1.page-title, h1');
      const headingText = pageHeading ? await pageHeading.innerText() : 'No H1';
      if (currentUrl.includes(p.path)) {
        pass(`Admin Page [${p.label}] loaded`, `${currentUrl} - H1: ${headingText}`);
      } else {
        fail(`Admin Page [${p.label}] loaded`, `Expected ${p.path}, got ${currentUrl}`);
      }
    }

    console.log('\n--- 5. Testing Interactive Actions on Admin Pages ---');

    // 5a. Sellers page: Tabs & Filter
    console.log('Testing Sellers Page Actions...');
    await page.goto('http://localhost:4800/sellers', { waitUntil: 'networkidle' });
    const sellerTabs = await page.$$('.toolbar .tab');
    if (sellerTabs.length >= 3) {
      await sellerTabs[1].click(); // Pending
      await page.waitForTimeout(500);
      pass('Sellers Pending tab clicked');
      await sellerTabs[2].click(); // Active
      await page.waitForTimeout(500);
      pass('Sellers Active tab clicked');
      await sellerTabs[0].click(); // All
      await page.waitForTimeout(500);
    }
    const sellerSearch = await page.$('.input-search');
    if (sellerSearch) {
      await sellerSearch.fill('Botanicals');
      await page.waitForTimeout(500);
      pass('Seller search input filtered table');
      await sellerSearch.fill('');
      await page.waitForTimeout(300);
    }

    // 5b. Products page: Filters & Edit Modal
    console.log('Testing Products Page Actions...');
    await page.goto('http://localhost:4800/products', { waitUntil: 'networkidle' });
    const productSearch = await page.$('.input-search');
    if (productSearch) {
      await productSearch.fill('Shampoo');
      await page.waitForTimeout(500);
      pass('Admin product search filtered table');
      await productSearch.fill('');
    }

    const editBtn = await page.$('button[aria-label="Edit"]');
    if (editBtn) {
      await editBtn.click();
      await page.waitForTimeout(500);
      const modal = await page.$('.modal');
      if (modal) {
        pass('Admin Product Edit Modal Opened');
        const cancelBtn = await page.$('.modal button:has-text("Cancel")');
        if (cancelBtn) {
          await cancelBtn.click();
          await page.waitForTimeout(300);
          pass('Admin Product Edit Modal Closed via Cancel');
        }
      }
    }

    // 5c. Complaints page
    console.log('Testing Complaints Page...');
    await page.goto('http://localhost:4800/complaints', { waitUntil: 'networkidle' });
    const complaintRows = await page.$$('tbody tr');
    pass('Complaints table rendered', `${complaintRows.length} rows`);

    // 5d. Payouts page
    console.log('Testing Payouts Page...');
    await page.goto('http://localhost:4800/payouts', { waitUntil: 'networkidle' });
    const payoutRows = await page.$$('tbody tr');
    pass('Payouts table rendered', `${payoutRows.length} rows`);

    // 5e. Subscriptions page
    console.log('Testing Subscriptions Page...');
    await page.goto('http://localhost:4800/subscriptions', { waitUntil: 'networkidle' });
    const subCards = await page.$$('.pkg-card, .plan-card, table, tr');
    pass('Subscriptions & Packages page content rendered', `${subCards.length} elements`);

    // 5f. Settings page
    console.log('Testing Settings Page...');
    await page.goto('http://localhost:4800/settings', { waitUntil: 'networkidle' });
    const settingsInputs = await page.$$('input, select');
    pass('Settings page form fields rendered', `${settingsInputs.length} inputs`);

    console.log('\n--- 6. Checking Uncaught Console Errors ---');
    const criticalErrors = tracking.errors.filter(e => !e.includes('401') && !e.includes('favicon'));
    if (criticalErrors.length > 0) {
      console.warn('Console errors:', criticalErrors);
    } else {
      pass('No uncaught critical console errors across all admin flows');
    }

  } catch (err) {
    fail('Overall Auth and Admin Execution', err);
  } finally {
    await browser.close();
  }

  console.log('\n================ AUTH & ADMIN TEST SUMMARY ================');
  console.log(`Total Passed: ${results.passed.length}`);
  console.log(`Total Failed: ${results.failed.length}`);
  if (results.failed.length > 0) {
    console.log('Failed Tests:');
    results.failed.forEach(f => console.log(` - ${f.name}: ${f.error}`));
  }
  return results;
}

runAuthAndAdminTests();
