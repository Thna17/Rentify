import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Read files directly to verify configuration and avoid bundling complexities
const dashboardTabsPath = path.join(rootDir, 'apps/core/merchant/src/config/dashboard-tabs.jsx');
const dashboardRoutesPath = path.join(rootDir, 'apps/core/merchant/src/routes/dashboardRoutes.jsx');
const filterTabsPath = path.join(rootDir, 'apps/core/merchant/src/utils/filterTabsByUserRole.js');
const getCurrentTabDataPath = path.join(rootDir, 'apps/core/merchant/src/utils/getCurrentTabData.js');

test('all required dashboard configuration files exist and are non-empty', () => {
  for (const filePath of [dashboardTabsPath, dashboardRoutesPath, filterTabsPath, getCurrentTabDataPath]) {
    assert.equal(fs.existsSync(filePath), true, `File missing: ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.length > 50, `File is empty or too short: ${filePath}`);
  }
});

test('dashboard-tabs defines Storefront Customization under channels for all relevant roles', () => {
  const content = fs.readFileSync(dashboardTabsPath, 'utf8');

  // Verify Storefront Customization entry
  assert.match(content, /path:\s*['"]store-management['"]/);
  assert.match(content, /label:\s*['"]Storefront Customization['"]/);
  assert.match(content, /channel:\s*['"]storefront['"]/);
  assert.match(content, /section:\s*['"]channels['"]/);

  // Verify roles include staff
  const storeMgmtBlock = content.match(/path:\s*['"]store-management['"][\s\S]*?section:\s*['"]channels['"]/)?.[0];
  assert.ok(storeMgmtBlock, 'Store management block must be found');
  assert.match(storeMgmtBlock, /'staff'/, 'Store management must allow staff role');
  assert.match(storeMgmtBlock, /'user'/, 'Store management must allow user role');
  assert.match(storeMgmtBlock, /'admin'/, 'Store management must allow admin role');
});

test('dashboard-tabs defines Marketplace Orders and POS under channels', () => {
  const content = fs.readFileSync(dashboardTabsPath, 'utf8');

  // Verify Marketplace Orders
  assert.match(content, /path:\s*['"]marketplace-orders['"]/);
  assert.match(content, /channel:\s*['"]marketplace['"]/);

  // Verify POS
  assert.match(content, /path:\s*['"]pos['"]/);
  assert.match(content, /channel:\s*['"]pos['"]/);
});

test('every tab in dashboard-tabs has a corresponding route in dashboardRoutes', () => {
  const tabsContent = fs.readFileSync(dashboardTabsPath, 'utf8');
  const routesContent = fs.readFileSync(dashboardRoutesPath, 'utf8');

  // Extract all paths from tabs
  const tabPathMatches = [...tabsContent.matchAll(/path:\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
  assert.ok(tabPathMatches.length >= 10, 'Should have at least 10 dashboard tab paths');

  for (const tabPath of tabPathMatches) {
    // If path has params like orders/:id, route must have orders/:id or base path
    const routeRegex = new RegExp(`path:\\s*['"]${tabPath}['"]`);
    assert.ok(
      routeRegex.test(routesContent),
      `Dashboard tab path "${tabPath}" is missing a corresponding route in dashboardRoutes.jsx`
    );
  }
});

test('filterTabsByUserRole is resilient to undefined or partial auth state', async () => {
  const { filterTabsByUserRole } = await import('../apps/core/merchant/src/utils/filterTabsByUserRole.js');

  const mockTabs = [
    { name: 'overview', path: 'overview', roles: ['admin', 'user', 'staff'] },
    { name: 'store-customization', path: 'store-management', roles: ['admin', 'user', 'staff'], channel: 'storefront' },
    { name: 'marketplace-orders', path: 'marketplace-orders', roles: ['admin', 'user', 'staff'], channel: 'marketplace' },
    { name: 'pos', path: 'pos', roles: ['admin', 'user', 'staff'], channel: 'pos', permission: 'manage_pos' },
    { name: 'settings', path: 'settings', roles: ['admin', 'user', 'staff'], permission: 'manage_settings' },
  ];

  // 1. Storefront merchant (all channels enabled)
  const storefrontMerchantTabs = filterTabsByUserRole(
    mockTabs,
    'user',
    [],
    null,
    { hasStorefront: true, hasMarketplace: true, hasPos: true }
  );
  assert.equal(storefrontMerchantTabs.some(t => t.path === 'store-management'), true);
  assert.equal(storefrontMerchantTabs.some(t => t.path === 'marketplace-orders'), true);
  assert.equal(storefrontMerchantTabs.some(t => t.path === 'pos'), true);

  // 2. Marketplace-only merchant (hasStorefront: false)
  const marketplaceMerchantTabs = filterTabsByUserRole(
    mockTabs,
    'user',
    [],
    null,
    { hasStorefront: false, hasMarketplace: true, hasPos: true }
  );
  assert.equal(marketplaceMerchantTabs.some(t => t.path === 'store-management'), false, 'Storefront should be hidden for marketplace-only merchant');
  assert.equal(marketplaceMerchantTabs.some(t => t.path === 'marketplace-orders'), true);
  assert.equal(marketplaceMerchantTabs.some(t => t.path === 'pos'), true);

  // 3. Staff user with permissions
  const staffTabs = filterTabsByUserRole(
    mockTabs,
    'staff',
    ['manage_pos', 'manage_settings'],
    null,
    { hasStorefront: true, hasMarketplace: true, hasPos: true }
  );
  assert.equal(staffTabs.some(t => t.path === 'store-management'), true, 'Staff should have access to store-management if attached');
  assert.equal(staffTabs.some(t => t.path === 'pos'), true, 'Staff with manage_pos should have pos tab');
  assert.equal(staffTabs.some(t => t.path === 'settings'), true, 'Staff with manage_settings should have settings tab');

  // 4. Undefined role fallback (should not crash or return empty)
  const fallbackTabs = filterTabsByUserRole(mockTabs, undefined, [], null);
  assert.ok(fallbackTabs.length > 0, 'Fallback role should preserve default merchant tabs');
});

test('getCurrentTabData correctly resolves root, parameterized, and nested child routes', async () => {
  const { getCurrentTabData } = await import('../apps/core/merchant/src/utils/getCurrentTabData.js');

  const mockTabs = [
    { name: 'overview', path: 'overview' },
    { name: 'products', path: 'products' },
    { name: 'product-detail', path: 'products/:id' },
    { name: 'store-customization', path: 'store-management' },
    { name: 'settings', path: 'settings' },
    { name: 'usage', path: 'usage' },
  ];

  // Root/empty
  assert.equal(getCurrentTabData('/', mockTabs).matchedTab?.path, 'overview');
  assert.equal(getCurrentTabData('/overview', mockTabs).matchedTab?.path, 'overview');

  // Direct tab
  assert.equal(getCurrentTabData('/store-management', mockTabs).matchedTab?.path, 'store-management');

  // Param route
  const productDetail = getCurrentTabData('/products/item-99', mockTabs);
  assert.equal(productDetail.matchedTab?.path, 'products/:id');
  assert.equal(productDetail.params?.id, 'item-99');

  // Nested settings tab
  assert.equal(getCurrentTabData('/settings/account', mockTabs).matchedTab?.path, 'settings');
  assert.equal(getCurrentTabData('/settings/staff', mockTabs).matchedTab?.path, 'settings');

  // Nested usage tab
  assert.equal(getCurrentTabData('/usage/dashboard', mockTabs).matchedTab?.path, 'usage');
  assert.equal(getCurrentTabData('/usage/billing', mockTabs).matchedTab?.path, 'usage');
});
