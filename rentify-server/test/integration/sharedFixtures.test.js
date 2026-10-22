// rentify-server/test/integration/sharedFixtures.test.js - Integration test validating shared platform fixtures in Core API

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createPlatformScenario,
  createInMemoryModelAdapter,
  seedCoreFixtures,
  cleanupCoreFixtures,
} = require('../fixtures');
const { createRequireAdmin } = require('../../src/middlewares/authorization');

test('shared fixtures: Core API successfully seeds and enforces tenant boundaries', async () => {
  const models = createInMemoryModelAdapter([
    'User',
    'WebsiteTemplate',
    'Store',
    'Website',
    'Staff',
    'Package',
    'Subscription',
    'SellerApplication',
  ]);

  const scenario = createPlatformScenario();
  const tracker = await seedCoreFixtures(models, scenario);

  // 1. Verify two distinct Stores exist
  const storeA = await models.Store.findByPk(scenario.ids.marketplaceStoreId);
  const storeB = await models.Store.findByPk(scenario.ids.storefrontStoreId);
  assert.ok(storeA, 'Store A must exist');
  assert.ok(storeB, 'Store B must exist');
  assert.equal(storeA.primaryCategory, 'Handicrafts & Pottery');
  assert.equal(storeB.primaryCategory, 'Fashion & Textiles');

  // 2. Invariant: Marketplace-only Store has no Website
  assert.equal(storeA.websiteId, null);
  const websiteA = await models.Website.findOne({ where: { storeId: storeA.id } });
  assert.equal(websiteA, null, 'Marketplace-only Store must not have a Website row');

  // 3. Invariant: Storefront Store has linked Website with distinct ID
  assert.equal(storeB.websiteId, scenario.ids.storefrontWebsiteId);
  const websiteB = await models.Website.findByPk(scenario.ids.storefrontWebsiteId);
  assert.ok(websiteB, 'Store B must have linked Website');
  assert.notEqual(storeB.id, websiteB.id, 'Store ID must not equal Website ID');
  assert.equal(websiteB.storeId, storeB.id);

  // 4. Staff permissions and merchant binding
  const staff = await models.Staff.findByPk(scenario.ids.staffId);
  assert.ok(staff);
  assert.equal(staff.merchantId, storeB.ownerUserId);
  assert.equal(staff.websiteId, websiteB.id);
  assert.deepEqual(staff.permissions, ['manage_pos', 'manage_products']);
  assert.equal(staff.permissions.includes('manage_staff'), false);

  // 5. Admin authorization check on fixture users
  const requireAdmin = createRequireAdmin({
    findUser: async (id) => models.User.findByPk(id),
  });

  const responseHelper = () => ({
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  });

  // Merchant owner should be denied admin access
  const merchantDenied = responseHelper();
  await requireAdmin(
    { user: { id: scenario.ids.merchantMarketplaceUserId, role: 'user' } },
    merchantDenied,
    () => assert.fail('Merchant owner must not access admin routes')
  );
  assert.equal(merchantDenied.statusCode, 403);

  // Platform admin user should be granted access
  let adminPassed = false;
  await requireAdmin(
    { user: { id: scenario.ids.adminUserId, role: 'admin' } },
    responseHelper(),
    () => { adminPassed = true; }
  );
  assert.equal(adminPassed, true);

  // 6. Subscriptions
  const subscription = await models.Subscription.findByPk(scenario.ids.subscriptionId);
  assert.ok(subscription);
  assert.equal(subscription.userId, storeB.ownerUserId);
  assert.equal(subscription.websiteId, websiteB.id);
  assert.equal(subscription.status, 'active');

  // 7. Cleanup
  const counts = await cleanupCoreFixtures(models, tracker);
  assert.equal(counts.Store, 2);
  assert.equal(counts.Website, 1);
  assert.equal(counts.User, 5);
  assert.equal(await models.Store.count(), 0);
  assert.equal(await models.User.count(), 0);
});
