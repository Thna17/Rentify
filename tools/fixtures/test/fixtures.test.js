// tools/fixtures/test/fixtures.test.js - Comprehensive test suite for shared platform fixtures

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  assertSafeTestEnvironment,
  UnsafeEnvironmentError,
  createPlatformScenario,
  createInMemoryModelAdapter,
  seedCoreFixtures,
  cleanupCoreFixtures,
  seedCommerceFixtures,
  cleanupCommerceFixtures,
  PlatformFixtureHarness,
} = require('../index');

test('safety: production database and host configurations are rejected', () => {
  // 1. NODE_ENV = production must be rejected
  const originalEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    assert.throws(
      () => assertSafeTestEnvironment({ database: 'rentify_core_test', host: 'localhost' }),
      (err) => err instanceof UnsafeEnvironmentError && err.message.includes('NODE_ENV is set to "production"')
    );
  } finally {
    process.env.NODE_ENV = originalEnv;
  }

  // 2. Database names without "test" or "mock" must be rejected
  const forbiddenDbs = ['rentify_core', 'rentify_ecommerce', 'production', 'prod_db', 'live_db', 'khmercraft'];
  for (const db of forbiddenDbs) {
    assert.throws(
      () => assertSafeTestEnvironment({ database: db, host: 'localhost' }),
      (err) => err instanceof UnsafeEnvironmentError && (err.message.includes('must contain "test"') || err.message.includes('Refusing to run')),
      `Expected ${db} to be rejected`
    );
  }

  // 3. Cloud and production hostnames must be rejected
  const forbiddenHosts = [
    'prod-mysql.rds.amazonaws.com',
    'db.live.rentifymarket.com',
    'sql.cloudsql.googleapis.com',
    'prod-database.internal',
    'azure.database.windows.net',
  ];
  for (const host of forbiddenHosts) {
    assert.throws(
      () => assertSafeTestEnvironment({ database: 'rentify_test', host }),
      (err) => err instanceof UnsafeEnvironmentError && err.message.includes('cloud or production database host'),
      `Expected host ${host} to be rejected`
    );
  }

  // 4. Valid test configurations must pass
  assert.equal(assertSafeTestEnvironment({ database: 'rentify_core_test', host: 'localhost' }).safe, true);
  assert.equal(assertSafeTestEnvironment({ database: 'rentify_commerce_test', host: '127.0.0.1' }).safe, true);
  assert.equal(assertSafeTestEnvironment({ database: ':memory:', host: 'in-memory' }).safe, true);
  assert.equal(assertSafeTestEnvironment({ database: 'mock_test_db', host: 'localhost' }).safe, true);
});

test('determinism: scenario generation produces stable, immutable identifiers and values', () => {
  const scenario1 = createPlatformScenario();
  const scenario2 = createPlatformScenario();

  // Stable IDs
  assert.equal(scenario1.ids.marketplaceStoreId, '10000000-0000-4000-8000-000000000001');
  assert.equal(scenario1.ids.storefrontStoreId, '10000000-0000-4000-8000-000000000002');
  assert.equal(scenario1.ids.storefrontWebsiteId, '30000000-0000-4000-8000-000000000002');

  // Both scenarios produce identical snapshots
  assert.deepEqual(scenario1.ids, scenario2.ids);
  assert.deepEqual(scenario1.stores, scenario2.stores);
  assert.deepEqual(scenario1.products, scenario2.products);
  assert.deepEqual(scenario1.orders, scenario2.orders);

  // Namespaced generation produces isolated, non-colliding deterministic IDs
  const namespaced = createPlatformScenario({ idPrefix: 'run-99' });
  assert.equal(namespaced.ids.marketplaceStoreId, 'run-99-10000000-0000-4000-8000-000000000001');
  assert.equal(namespaced.ids.storefrontStoreId, 'run-99-10000000-0000-4000-8000-000000000002');
  assert.notEqual(namespaced.ids.marketplaceStoreId, scenario1.ids.marketplaceStoreId);
});

test('tenant isolation: stores, websites, users, and catalog maintain strict platform invariants', () => {
  const scenario = createPlatformScenario();

  // Invariant 1: Store A is marketplace-only and has NO website
  assert.equal(scenario.stores.marketplaceOnly.websiteId, null);
  assert.equal(scenario.stores.marketplaceOnly.primaryCategory, 'Handicrafts & Pottery');
  assert.equal(scenario.stores.marketplaceOnly.marketplaceEnabled, true);

  // Invariant 2: Store B has a website, and Website ID does NOT equal Store ID
  assert.notEqual(scenario.stores.storefrontAndMarketplace.id, scenario.websites.storefront.id);
  assert.equal(scenario.websites.storefront.storeId, scenario.stores.storefrontAndMarketplace.id);
  assert.equal(scenario.stores.storefrontAndMarketplace.primaryCategory, 'Fashion & Textiles');

  // Invariant 3: Store owners are distinct individuals
  assert.notEqual(scenario.stores.marketplaceOnly.ownerUserId, scenario.stores.storefrontAndMarketplace.ownerUserId);

  // Invariant 4: Staff member belongs strictly to Store B with limited permissions
  assert.equal(scenario.staff.posStaff.merchantId, scenario.stores.storefrontAndMarketplace.ownerUserId);
  assert.equal(scenario.staff.posStaff.websiteId, scenario.websites.storefront.id);
  assert.deepEqual(scenario.staff.posStaff.permissions, ['manage_pos', 'manage_products']);
  assert.equal(scenario.staff.posStaff.permissions.includes('manage_orders'), false);
  assert.equal(scenario.staff.posStaff.permissions.includes('manage_staff'), false);

  // Invariant 5: Products are segregated by store
  assert.equal(scenario.products.simpleVase.storeId, scenario.stores.marketplaceOnly.id);
  assert.equal(scenario.products.simpleVase.websiteId, null);
  assert.equal(scenario.products.variantScarf.storeId, scenario.stores.storefrontAndMarketplace.id);
  assert.equal(scenario.products.variantScarf.websiteId, scenario.websites.storefront.id);

  // Invariant 6: Carts and orders preserve store separation
  assert.equal(scenario.carts.marketplaceCart.storeId, scenario.stores.marketplaceOnly.id);
  assert.equal(scenario.carts.storefrontCart.storeId, scenario.stores.storefrontAndMarketplace.id);
  assert.equal(scenario.orders.marketplaceCod.storeId, scenario.stores.marketplaceOnly.id);
  assert.equal(scenario.orders.storefrontDelivered.storeId, scenario.stores.storefrontAndMarketplace.id);
  assert.equal(scenario.orders.storefrontRefunded.storeId, scenario.stores.storefrontAndMarketplace.id);
});

test('cleanup safety: teardown deletes only fixture-created records and preserves pre-existing rows', async () => {
  const coreModels = createInMemoryModelAdapter([
    'User',
    'WebsiteTemplate',
    'Store',
    'Website',
    'Staff',
    'Package',
    'Subscription',
    'SellerApplication',
  ]);

  // Insert pre-existing user and store belonging to another test/developer
  const preExistingUser = await coreModels.User.create({
    id: 'pre-existing-user-1234',
    name: 'Existing Developer',
    email: 'existing.dev@rentify.test',
  });
  const preExistingStore = await coreModels.Store.create({
    id: 'pre-existing-store-5678',
    ownerUserId: preExistingUser.id,
    name: 'Pre-existing Store',
    slug: 'pre-existing-store',
  });

  // Seed fixtures
  const tracker = await seedCoreFixtures(coreModels);
  assert.equal(await coreModels.User.count(), 1 + 5); // 1 pre-existing + 5 fixture users
  assert.equal(await coreModels.Store.count(), 1 + 2); // 1 pre-existing + 2 fixture stores

  // Cleanup fixtures
  await cleanupCoreFixtures(coreModels, tracker);

  // Pre-existing rows must remain intact
  assert.equal(await coreModels.User.count(), 1);
  assert.equal(await coreModels.Store.count(), 1);
  assert.equal((await coreModels.User.findByPk('pre-existing-user-1234')).name, 'Existing Developer');
  assert.equal((await coreModels.Store.findByPk('pre-existing-store-5678')).name, 'Pre-existing Store');
});

test('cross-service coherence: PlatformFixtureHarness binds Core and Commerce scenarios deterministically', async () => {
  const coreModels = createInMemoryModelAdapter([
    'User',
    'WebsiteTemplate',
    'Store',
    'Website',
    'Staff',
    'Package',
    'Subscription',
    'SellerApplication',
  ]);

  const commerceModels = createInMemoryModelAdapter([
    'StoreAccess',
    'WebsiteData',
    'StoreDeliveryPolicy',
    'Category',
    'Product',
    'ProductVariant',
    'Customer',
    'Cart',
    'CartItem',
    'Order',
    'OrderItem',
    'Payment',
    'Invoice',
    'ShippingDetail',
    'OrderEvent',
  ]);

  const harness = new PlatformFixtureHarness({
    coreModels,
    commerceModels,
  });

  const scenario = await harness.setup();

  // Verify Core records created
  assert.equal(await coreModels.Store.count(), 2);
  assert.equal(await coreModels.Website.count(), 1);
  assert.equal(await coreModels.User.count(), 5);

  // Verify Commerce records created
  assert.equal(await commerceModels.StoreAccess.count(), 2);
  assert.equal(await commerceModels.WebsiteData.count(), 1);
  assert.equal(await commerceModels.Product.count(), 2);
  assert.equal(await commerceModels.ProductVariant.count(), 2);
  assert.equal(await commerceModels.Order.count(), 3);
  assert.equal(await commerceModels.Invoice.count(), 1);
  assert.equal(await commerceModels.OrderEvent.count(), 1);

  // Verify 1:1 cross-service mapping
  const coreStoreB = await coreModels.Store.findByPk(scenario.ids.storefrontStoreId);
  const commStoreB = await commerceModels.StoreAccess.findByPk(scenario.ids.storefrontStoreId);
  assert.equal(coreStoreB.id, commStoreB.storeId);
  assert.equal(coreStoreB.ownerUserId, commStoreB.ownerUserId);
  assert.equal(coreStoreB.primaryCategory, commStoreB.primaryCategory);

  const coreWebB = await coreModels.Website.findByPk(scenario.ids.storefrontWebsiteId);
  const commWebB = await commerceModels.WebsiteData.findOne({ where: { websiteId: scenario.ids.storefrontWebsiteId } });
  assert.equal(coreWebB.id, commWebB.websiteId);
  assert.equal(coreWebB.storeId, commWebB.storeId);
  assert.equal(coreWebB.userId, commWebB.userId);

  // Teardown
  const teardownStats = await harness.teardown();
  assert.equal(teardownStats.core.Store, 2);
  assert.equal(teardownStats.commerce.StoreAccess, 2);
  assert.equal(teardownStats.commerce.Order, 3);

  // Both datastores are empty after teardown
  assert.equal(await coreModels.Store.count(), 0);
  assert.equal(await commerceModels.StoreAccess.count(), 0);
});
