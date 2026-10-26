import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const tabs = read('apps/core/merchant/src/config/dashboard-tabs.jsx');
const layout = read('apps/core/merchant/src/layouts/dashboard/Layout.jsx');
const sidebar = read('apps/core/merchant/src/layouts/dashboard/AppSidebar.jsx');
const nav = read('apps/core/merchant/src/layouts/dashboard/NavMain.jsx');
const header = read('apps/core/merchant/src/layouts/dashboard/SiteHeader.jsx');
const notifications = read('apps/core/merchant/src/layouts/dashboard/NotificationDropdown.jsx');
const workspaceState = read('apps/core/merchant/src/components/WorkspaceState.tsx');
const pageHeader = read('libs/shared/src/layouts/dashboard/PageHeader.tsx');
const styles = read('apps/core/merchant/src/styles.css');
const en = JSON.parse(read('libs/utils/src/locales/en.json'));
const kh = JSON.parse(read('libs/utils/src/locales/kh.json'));

test('merchant shell exposes the Phase 4 information architecture', () => {
  for (const label of [
    'Overview', 'Products', 'Inventory', 'Orders', 'POS', 'Invoices',
    'Storefront', 'Marketplace', 'Staff', 'Reports', 'Settings',
  ]) {
    assert.match(tabs, new RegExp(`label: '${label}'`));
  }
  assert.match(tabs, /externalHref: POS_URL/);
  assert.doesNotMatch(tabs, /ADMIN_DASHBOARD_URL|platform administration/i);
});

test('authorization-aware presentation retains server authorization boundary', () => {
  assert.match(tabs, /server APIs remain the authorization authority/);
  assert.match(tabs, /permission: 'manage_products'/);
  assert.match(tabs, /permission: 'manage_orders'/);
  assert.match(tabs, /permission: 'manage_staff'/);
  assert.match(layout, /<UnauthorizedAccess/);
});

test('responsive shell uses desktop landmark and an accessible mobile sheet', () => {
  assert.match(sidebar, /<aside/);
  assert.match(sidebar, /<SheetTitle className="sr-only">/);
  assert.match(sidebar, /<SheetDescription className="sr-only">/);
  assert.match(sidebar, /max-w-\[88vw\]/);
  assert.match(header, /sm:hidden/);
  assert.match(header, /hidden w-full max-w-md sm:block/);
});

test('shell and page heading provide keyboard and semantic landmarks', () => {
  assert.match(layout, /href="#merchant-main-content"/);
  assert.match(layout, /id="merchant-main-content" tabIndex="-1"/);
  assert.match(nav, /<nav/);
  assert.match(pageHeader, /<header/);
  assert.match(pageHeader, /aria-label=\{breadcrumbAriaLabel\}/);
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
});

test('English and Khmer cover navigation, shell recovery, and long labels', () => {
  for (const locale of [en, kh]) {
    assert.ok(locale.dashboard.navigation.inventory);
    assert.ok(locale.dashboard.navigation.marketplace);
    assert.ok(locale.dashboard.navigation.reports);
    assert.ok(locale.dashboard.navigation.staff);
    assert.ok(locale.dashboard.shell.loading_workspace);
    assert.ok(locale.dashboard.shell.no_store_description);
    assert.ok(locale.dashboard.shell.search_navigation);
  }
  assert.ok(kh.dashboard.shell.launch_storefront_description.length > 20);
});

test('merchant styles consume P1 design tokens and define zoom-safe wrapping', () => {
  assert.match(styles, /packages\/design-tokens\/index\.css/);
  assert.match(styles, /var\(--rentify-shadow-sm\)/);
  assert.match(styles, /overflow-wrap: anywhere/);
});

test('notification shell contains no seeded orders, payouts, or decorative counts', () => {
  assert.doesNotMatch(notifications, /INITIAL_NOTIFICATIONS|ORD-\d+|unreadCount|merchant_notifications/);
  assert.match(notifications, /does not yet expose a merchant notifications contract/);
});

test('workspace recovery foundation covers required operational states', () => {
  for (const state of ['conflict', 'empty', 'error', 'forbidden', 'loading', 'offline', 'timeout']) {
    assert.match(workspaceState, new RegExp(`${state}:`));
  }
  assert.match(layout, /storeLoadError/);
  assert.match(layout, /navigator\.onLine/);
  assert.match(workspaceState, /aria-live=/);
  assert.match(workspaceState, /aria-busy=/);
});
