// test/security/versionedEntitlements.test.js
// Table-driven test suite for P2-ENT-001: Versioned Capability Enforcement in Commerce API.

const test = require('node:test');
const assert = require('node:assert/strict');
const { Sequelize } = require('sequelize');

Sequelize.prototype.authenticate = async () => {};
Sequelize.prototype.validate = async () => {};

const { sequelize } = require('../../config/db');
sequelize.authenticate = async () => {};
sequelize.validate = async () => {};

const { StoreAccess, Product, Order, Invoice } = require('../../models');
const { createRequireStoreAccess } = require('../../middlewares/requireStoreAccess');
const { getStoreEntitlements, applySnapshot } = require('../../modules/store-access/storeAccessService');

const STORE_PILOT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const STORE_STARTER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const STORE_SUSPENDED_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const OWNER_A_ID = '11111111-1111-4111-8111-111111111111';
const OWNER_B_ID = '22222222-2222-4222-8222-222222222222';
const ADMIN_ID = '99999999-9999-4999-8999-999999999999';

const responseHelper = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test('P2-ENT-001: Commerce Authoritative Entitlement Consumption & Safe Fallback', () => {
  // 1. Store with explicit versioned entitlements projection
  const projectedStore = {
    storeId: STORE_STARTER_ID,
    ownerUserId: OWNER_B_ID,
    websiteId: 'web-1',
    status: 'active',
    marketplaceEntitlement: 'pilot',
    entitlementVersion: 1,
    entitlements: {
      version: 1,
      tier: 'starter',
      displayName: 'Starter',
      lifecycleState: 'active',
      mutationsAllowed: true,
      capabilities: {
        marketplaceListing: true,
        website: true,
        productLimit: 100,
        staffLimit: 2,
        pos: true,
        invoices: true,
        customDomainBrowse: false,
        hostedCheckout: true,
        historicalOrderRead: true,
      },
    },
  };

  const evalProjected = getStoreEntitlements(projectedStore);
  assert.equal(evalProjected.version, 1);
  assert.equal(evalProjected.tier, 'starter');
  assert.equal(evalProjected.capabilities.productLimit, 100);
  assert.equal(evalProjected.capabilities.hostedCheckout, true);
  assert.equal(evalProjected.mutationsAllowed, true);

  // 2. Fallback when entitlements JSON is missing
  const legacyStore = {
    storeId: STORE_PILOT_ID,
    ownerUserId: OWNER_A_ID,
    status: 'active',
    marketplaceEntitlement: 'pilot',
    marketplaceEnabled: true,
  };
  const evalFallback = getStoreEntitlements(legacyStore);
  assert.equal(evalFallback.version, 1);
  assert.equal(evalFallback.tier, 'free_pilot');
  assert.equal(evalFallback.capabilities.productLimit, 25);
  assert.equal(evalFallback.capabilities.hostedCheckout, true);
});

test('P2-ENT-001: Product Limit & Mutation Lock Enforcement in Store Catalog Service', async (t) => {
  const storeCatalog = require('../../modules/store-catalog/storeCatalogService');
  const { sequelize } = require('../../config/db');

  t.mock.method(sequelize, 'transaction', async (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }));

  // Case A: Store in Grace Period (mutationsAllowed = false)
  const graceStoreAccess = {
    storeId: STORE_PILOT_ID,
    ownerUserId: OWNER_A_ID,
    status: 'active',
    entitlements: {
      version: 1,
      tier: 'free_pilot',
      displayName: 'Free Pilot',
      lifecycleState: 'grace_period',
      mutationsAllowed: false,
      restrictionReason: 'Product creation is disabled during subscription grace period',
      capabilities: { productLimit: 25 },
    },
  };

  t.mock.method(StoreAccess, 'findByPk', async () => graceStoreAccess);

  await assert.rejects(
    async () => {
      await storeCatalog.create(graceStoreAccess, {
        name: 'Handmade Bowl',
        price: '15.00',
        marketplaceCategory: 'Pottery',
        stockQuantity: 10,
        status: 'draft',
      });
    },
    (err) => {
      assert.equal(err.statusCode, 403);
      assert.equal(err.code, 'CAPABILITY_MUTATION_LOCKED');
      assert.ok(err.message.includes('grace period'));
      return true;
    }
  );

  // Case B: Store at Product Limit (25/25 on Free Pilot)
  const activeStoreAccess = {
    storeId: STORE_PILOT_ID,
    ownerUserId: OWNER_A_ID,
    status: 'active',
    entitlements: {
      version: 1,
      tier: 'free_pilot',
      displayName: 'Free Pilot',
      lifecycleState: 'active',
      mutationsAllowed: true,
      capabilities: { productLimit: 25 },
    },
  };

  t.mock.method(StoreAccess, 'findByPk', async () => activeStoreAccess);
  t.mock.method(Product, 'count', async () => 25); // At limit

  await assert.rejects(
    async () => {
      await storeCatalog.create(activeStoreAccess, {
        name: 'Handmade Plate',
        price: '12.00',
        marketplaceCategory: 'Pottery',
        stockQuantity: 5,
        status: 'draft',
      });
    },
    (err) => {
      assert.equal(err.statusCode, 403);
      assert.equal(err.code, 'PRODUCT_LIMIT_EXCEEDED');
      assert.ok(err.message.includes('limit of 25'));
      return true;
    }
  );
});

test('P2-ENT-001: POS Capability Enforcement in requireStoreAccess', async () => {
  // Store with pos: false
  const storeNoPos = {
    storeId: 'store-no-pos',
    ownerUserId: OWNER_A_ID,
    status: 'active',
    entitlements: {
      version: 1,
      capabilities: { pos: false },
    },
  };

  const guard = createRequireStoreAccess({
    findStore: async () => storeNoPos,
    permissions: ['pos'],
  });

  const req = {
    user: { id: OWNER_A_ID, type: 'user', role: 'user' },
    params: { storeId: 'store-no-pos' },
  };
  const res = responseHelper();

  await guard(req, res, () => assert.fail('Must not proceed'));
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, 'CAPABILITY_UNAVAILABLE');
  assert.ok(res.body.error.includes('Point of Sale (POS) is not enabled'));
});

test('P2-ENT-001: Invoicing Capability Enforcement in requireStoreAccess', async () => {
  // Store with invoices: false
  const storeNoInvoices = {
    storeId: 'store-no-invoices',
    ownerUserId: OWNER_A_ID,
    status: 'active',
    entitlements: {
      version: 1,
      capabilities: { invoices: false },
    },
  };

  const guard = createRequireStoreAccess({
    findStore: async () => storeNoInvoices,
    permissions: ['invoices'],
  });

  const req = {
    user: { id: OWNER_A_ID, type: 'user', role: 'user' },
    params: { storeId: 'store-no-invoices' },
  };
  const res = responseHelper();

  await guard(req, res, () => assert.fail('Must not proceed'));
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, 'CAPABILITY_UNAVAILABLE');
  assert.ok(res.body.error.includes('Invoicing is not enabled'));
});

test('P2-ENT-001: 90-Day Historical Order & Invoice Access Policy', async () => {
  // Store suspended within 90 days: historicalOrderRead = true
  const storeWithin90Days = {
    storeId: STORE_SUSPENDED_ID,
    ownerUserId: OWNER_A_ID,
    status: 'suspended',
    entitlements: {
      version: 1,
      lifecycleState: 'suspended',
      capabilities: { historicalOrderRead: true },
    },
  };

  const guardAllowSuspended = createRequireStoreAccess({
    findStore: async () => storeWithin90Days,
    permissions: ['orders'],
    allowSuspended: true,
  });

  let nextCalled = false;
  const reqRead = {
    method: 'GET',
    user: { id: OWNER_A_ID, type: 'user', role: 'user' },
    params: { storeId: STORE_SUSPENDED_ID },
  };
  const resRead = responseHelper();

  await guardAllowSuspended(reqRead, resRead, () => { nextCalled = true; });
  assert.equal(nextCalled, true, 'Historical read within 90 days must be permitted');

  // Store suspended beyond 90 days: historicalOrderRead = false
  const storePast90Days = {
    storeId: STORE_SUSPENDED_ID,
    ownerUserId: OWNER_A_ID,
    status: 'suspended',
    entitlements: {
      version: 1,
      lifecycleState: 'suspended',
      capabilities: { historicalOrderRead: false },
      restrictionReason: 'Historical order read access expired (90 days post-suspension limit reached)',
    },
  };

  const guardPast90Days = createRequireStoreAccess({
    findStore: async () => storePast90Days,
    permissions: ['orders'],
    allowSuspended: true,
  });

  const resExpired = responseHelper();
  await guardPast90Days(reqRead, resExpired, () => assert.fail('Must be denied'));
  assert.equal(resExpired.statusCode, 403);
  assert.equal(resExpired.body.code, 'HISTORICAL_ACCESS_EXPIRED');

  // Administrator can still access suspended store past 90 days
  const reqAdmin = {
    method: 'GET',
    user: { id: ADMIN_ID, type: 'user', role: 'admin' },
    params: { storeId: STORE_SUSPENDED_ID },
  };
  let adminNext = false;
  await guardPast90Days(reqAdmin, responseHelper(), () => { adminNext = true; });
  assert.equal(adminNext, true, 'Platform admin must be permitted to override');
});
