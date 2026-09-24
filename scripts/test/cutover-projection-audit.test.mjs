import test from 'node:test';
import assert from 'node:assert/strict';
import { compareSnapshots } from '../cutover-projection-audit.mjs';

const core = () => ({ schemaVersion: 1, source: 'core', database: 'core-test',
  generatedAt: '2026-09-24T00:00:00Z', pendingStoreIds: [], pendingWebsiteIds: [],
  stores: [{ id: 'store-1', ownerUserId: 'owner-1', primaryCategory: 'Fashion',
    needsCategoryReview: false, marketplaceEnabled: true,
    marketplaceApprovalStatus: 'approved', status: 'active',
    marketplaceEntitlement: 'pilot', projectionVersion: 3 }],
  websites: [{ id: 'site-1', storeId: 'store-1', userId: 'owner-1',
    domain: 'fashion.example.test', status: 'active' }],
});
const commerce = () => ({ schemaVersion: 1, source: 'commerce', database: 'commerce-test',
  generatedAt: '2026-09-24T00:00:01Z',
  stores: [{ storeId: 'store-1', ownerUserId: 'owner-1', websiteId: 'site-1',
    primaryCategory: 'Fashion', needsCategoryReview: 0, marketplaceEnabled: 1,
    marketplaceApprovalStatus: 'approved', status: 'active',
    marketplaceEntitlement: 'pilot', version: 3 }],
  websites: [{ websiteId: 'site-1', storeId: 'store-1', userId: 'owner-1',
    domain: 'fashion.example.test', status: 'active' }],
});

test('matching Core and Commerce projections pass', () => {
  const report = compareSnapshots(core(), commerce());
  assert.equal(report.projectionReady, true);
  assert.deepEqual(report.findings, []);
});

test('pending messages and mismatched tenant links block cutover', () => {
  const source = core();
  const target = commerce();
  source.pendingStoreIds.push('store-1');
  target.stores[0].websiteId = 'site-other';
  target.websites[0].userId = 'owner-other';
  const report = compareSnapshots(source, target);
  assert.equal(report.projectionReady, false);
  assert.deepEqual(report.findings.map((finding) => finding.type), [
    'pending_store_sync', 'store_website_mismatch', 'website_field_mismatch',
  ]);
});

test('orphaned Commerce rows and incomplete approved seller category block cutover', () => {
  const source = core();
  const target = commerce();
  source.stores[0].needsCategoryReview = true;
  target.stores[0].needsCategoryReview = true;
  target.stores.push({ ...target.stores[0], storeId: 'orphan-store' });
  const report = compareSnapshots(source, target);
  assert.equal(report.projectionReady, false);
  assert.ok(report.findings.some((finding) => finding.type === 'approved_store_category_unreviewed'));
  assert.ok(report.findings.some((finding) => finding.type === 'orphan_commerce_store'));
});
