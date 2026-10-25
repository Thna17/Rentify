// test/security/posInvoiceStoreOwnership.test.js
// Table-driven security test suite for P2-AUTHZ-002: POS and Invoice Slice.
// Validates Store-scoping, staff permissions, website-ownership decoupling,
// direct-ID guessing prevention (404), public access tokens, body parameter
// override resistance, and platform admin audit logging.

const test = require('node:test');
const assert = require('node:assert/strict');
const { createRequireStoreAccess } = require('../../middlewares/requireStoreAccess');
const { createRequireWebsiteAccess, requireInvoiceAccess, requirePlatformAdmin } = require('../../middlewares/requireWebsiteAccess');
const { Invoice, Order, StoreAccess, WebsiteData } = require('../../models');
const { logger } = require('../../utils/logger');

const responseHelper = () => ({
  statusCode: 200,
  body: null,
  headers: {},
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
  send(body) { this.body = body; return this; },
  setHeader(name, val) { this.headers[name] = val; return this; },
});

// Fixture UUIDs
const STORE_A = '11111111-1111-4111-8111-111111111111';
const STORE_B = '22222222-2222-4222-8222-222222222222';
const WEBSITE_A = '33333333-3333-4333-8333-333333333333';
const WEBSITE_B = '44444444-4444-4444-8444-444444444444';
const OWNER_A = '55555555-5555-4555-8555-555555555555';
const OWNER_B = '66666666-6666-4666-8666-666666666666';
const BUYER_A = '77777777-7777-4777-8777-777777777777';
const BUYER_B = '88888888-8888-4888-8888-888888888888';
const INVOICE_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const INVOICE_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ORDER_A = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

test('P2-AUTHZ-002: Actor Matrix Table-Driven Authorization for POS', async (t) => {
  const storeA = { storeId: STORE_A, ownerUserId: OWNER_A, websiteId: WEBSITE_A, status: 'active' };
  const storeB = { storeId: STORE_B, ownerUserId: OWNER_B, websiteId: WEBSITE_B, status: 'active' };
  const suspendedStore = { storeId: 'suspended-store-id', ownerUserId: OWNER_A, websiteId: 'suspended-web-id', status: 'suspended' };

  const storeMap = new Map([
    [STORE_A, storeA],
    [STORE_B, storeB],
    ['suspended-store-id', suspendedStore],
  ]);

  const actors = [
    {
      archetype: 'storeOwner',
      user: { id: OWNER_A, type: 'user', role: 'merchant' },
      expectedAllowStoreA: true,
      expectedAllowStoreB: false,
    },
    {
      archetype: 'permittedStaff',
      user: { id: 'staff-pos', type: 'staff', merchantId: OWNER_A, websiteId: WEBSITE_A, permissions: ['pos', 'manage_pos'] },
      expectedAllowStoreA: true,
      expectedAllowStoreB: false,
    },
    {
      archetype: 'unpermittedStaff',
      user: { id: 'staff-no-pos', type: 'staff', merchantId: OWNER_A, websiteId: WEBSITE_A, permissions: ['products'] },
      expectedAllowStoreA: false,
      expectedAllowStoreB: false,
    },
    {
      archetype: 'unrelatedMerchant',
      user: { id: OWNER_B, type: 'user', role: 'merchant' },
      expectedAllowStoreA: false,
      expectedAllowStoreB: true,
    },
    {
      archetype: 'suspendedActor',
      user: { id: OWNER_A, type: 'user', role: 'merchant', status: 'suspended' },
      expectedAllowStoreA: false,
      expectedAllowStoreB: false,
    },
    {
      archetype: 'buyer',
      user: { id: BUYER_A, type: 'customer' },
      expectedAllowStoreA: false,
      expectedAllowStoreB: false,
    },
    {
      archetype: 'publicUser',
      user: null,
      expectedAllowStoreA: false,
      expectedAllowStoreB: false,
    },
    {
      archetype: 'platformAdmin',
      user: { id: 'admin-super', type: 'user', role: 'admin' },
      expectedAllowStoreA: true,
      expectedAllowStoreB: true,
    },
  ];

  const recordedAudits = [];
  t.mock.method(logger, 'info', (msg, meta) => {
    if (meta?.auditEvent) recordedAudits.push({ msg, meta });
  });

  for (const actor of actors) {
    const middlewareA = createRequireStoreAccess({
      findStore: async (id) => storeMap.get(id),
      permissions: ['pos', 'manage_pos'],
    });

    const reqA = { params: { storeId: STORE_A }, user: actor.user, originalUrl: `/api/stores/${STORE_A}/orders/pos`, method: 'POST' };
    const resA = responseHelper();
    let nextA = false;
    await middlewareA(reqA, resA, () => { nextA = true; });

    assert.equal(
      nextA,
      actor.expectedAllowStoreA,
      `Actor ${actor.archetype} accessing Store A POS: expected ${actor.expectedAllowStoreA}, got ${nextA}`
    );

    // Verify platform admin override recorded audit log
    if (actor.archetype === 'platformAdmin') {
      const adminAudit = recordedAudits.find(a => a.meta?.auditEvent === 'ADMIN_OVERRIDE' && a.meta?.storeId === STORE_A);
      assert.ok(adminAudit, 'Admin override on POS must produce structured audit log');
      assert.equal(adminAudit.meta.adminUserId, 'admin-super');
    }
  }

  // Suspended Store Check
  const middlewareSuspended = createRequireStoreAccess({
    findStore: async (id) => storeMap.get(id),
    permissions: ['pos', 'manage_pos'],
  });
  const reqSuspended = { params: { storeId: 'suspended-store-id' }, user: { id: OWNER_A, type: 'user', role: 'merchant' } };
  const resSuspended = responseHelper();
  let nextSuspended = false;
  await middlewareSuspended(reqSuspended, resSuspended, () => { nextSuspended = true; });
  assert.equal(nextSuspended, false);
  assert.equal(resSuspended.statusCode, 403);
  assert.equal(resSuspended.body.error, 'Store is not active');
});

test('P2-AUTHZ-002: Actor Matrix Table-Driven Authorization for Invoices', async (t) => {
  const storeA = { storeId: STORE_A, ownerUserId: OWNER_A, websiteId: WEBSITE_A, status: 'active' };
  const storeB = { storeId: STORE_B, ownerUserId: OWNER_B, websiteId: WEBSITE_B, status: 'active' };

  const storeMap = new Map([
    [STORE_A, storeA],
    [STORE_B, storeB],
  ]);

  const websiteMap = new Map([
    [WEBSITE_A, { websiteId: WEBSITE_A, storeId: STORE_A, userId: OWNER_A, status: 'active', staffData: [] }],
    [WEBSITE_B, { websiteId: WEBSITE_B, storeId: STORE_B, userId: OWNER_B, status: 'active', staffData: [] }],
  ]);

  const actors = [
    {
      archetype: 'storeOwner',
      user: { id: OWNER_A, type: 'user', role: 'merchant' },
      expectedAllowSiteA: true,
      expectedAllowSiteB: false,
    },
    {
      archetype: 'permittedStaff',
      user: { id: 'staff-inv', type: 'staff', merchantId: OWNER_A, websiteId: WEBSITE_A, permissions: ['invoices', 'manage_invoices'] },
      expectedAllowSiteA: true,
      expectedAllowSiteB: false,
    },
    {
      archetype: 'unpermittedStaff',
      user: { id: 'staff-no-inv', type: 'staff', merchantId: OWNER_A, websiteId: WEBSITE_A, permissions: ['pos'] },
      expectedAllowSiteA: false,
      expectedAllowSiteB: false,
    },
    {
      archetype: 'unrelatedMerchant',
      user: { id: OWNER_B, type: 'user', role: 'merchant' },
      expectedAllowSiteA: false,
      expectedAllowSiteB: true,
    },
    {
      archetype: 'suspendedActor',
      user: { id: OWNER_A, type: 'user', role: 'merchant', status: 'suspended' },
      expectedAllowSiteA: false,
      expectedAllowSiteB: false,
    },
    {
      archetype: 'buyer',
      user: { id: BUYER_A, type: 'customer' },
      expectedAllowSiteA: false,
      expectedAllowSiteB: false,
    },
    {
      archetype: 'publicUser',
      user: null,
      expectedAllowSiteA: false,
      expectedAllowSiteB: false,
    },
    {
      archetype: 'platformAdmin',
      user: { id: 'admin-super', type: 'user', role: 'admin' },
      expectedAllowSiteA: true,
      expectedAllowSiteB: true,
    },
  ];

  for (const actor of actors) {
    const middlewareA = createRequireWebsiteAccess({
      findWebsite: async (id) => websiteMap.get(id),
      findStore: async (id) => storeMap.get(id),
      requiredPermissions: ['invoices', 'invoice'],
    });

    const reqA = { params: { websiteId: WEBSITE_A }, user: actor.user };
    const resA = responseHelper();
    let nextA = false;
    await middlewareA(reqA, resA, () => { nextA = true; });

    assert.equal(
      nextA,
      actor.expectedAllowSiteA,
      `Actor ${actor.archetype} accessing Website A invoices: expected ${actor.expectedAllowSiteA}, got ${nextA}`
    );
  }
});

test('P2-AUTHZ-002: Direct-ID Guessing Prevention on Invoice PDFs (404 Rejection & Token Protection)', async (t) => {
  const invoiceA = {
    id: INVOICE_A,
    storeId: STORE_A,
    websiteId: WEBSITE_A,
    orderId: ORDER_A,
    invoiceNumber: 'INV-AAA-1001',
    pdfUrl: 'https://cdn.rentify.local/invoices/inv-aaa-1001.pdf',
    status: 'paid',
  };

  const invoiceB = {
    id: INVOICE_B,
    storeId: STORE_B,
    websiteId: WEBSITE_B,
    orderId: 'order-b-id',
    invoiceNumber: 'INV-BBB-2002',
    pdfUrl: 'https://cdn.rentify.local/invoices/inv-bbb-2002.pdf',
    status: 'paid',
  };

  const storeA = { storeId: STORE_A, ownerUserId: OWNER_A, status: 'active' };
  const storeB = { storeId: STORE_B, ownerUserId: OWNER_B, status: 'active' };

  const orderA = {
    id: ORDER_A,
    storeId: STORE_A,
    websiteId: WEBSITE_A,
    buyerId: BUYER_A,
    userId: BUYER_A,
  };

  t.mock.method(Invoice, 'findByPk', async (id) => {
    if (id === INVOICE_A) return invoiceA;
    if (id === INVOICE_B) return invoiceB;
    return null;
  });

  t.mock.method(StoreAccess, 'findByPk', async (id) => {
    if (id === STORE_A) return storeA;
    if (id === STORE_B) return storeB;
    return null;
  });

  t.mock.method(Order, 'findByPk', async (id) => {
    if (id === ORDER_A) return orderA;
    return null;
  });

  // Scenario 1: Unrelated merchant B guesses Invoice A -> must return 404 (NOT 403) to prevent ID enumeration
  const reqUnrelated = {
    params: { invoiceId: INVOICE_A },
    user: { id: OWNER_B, type: 'user', role: 'merchant' },
  };
  const resUnrelated = responseHelper();
  let nextUnrelated = false;
  await requireInvoiceAccess(reqUnrelated, resUnrelated, () => { nextUnrelated = true; });

  assert.equal(nextUnrelated, false);
  assert.equal(resUnrelated.statusCode, 404, 'Direct-ID guessing of foreign invoice must return 404');
  assert.equal(resUnrelated.body.error, 'Invoice not found');

  // Scenario 2: Unrelated buyer B guesses Invoice A -> returns 404
  const reqBuyerCross = {
    params: { invoiceId: INVOICE_A },
    user: { id: BUYER_B, type: 'user' },
  };
  const resBuyerCross = responseHelper();
  let nextBuyerCross = false;
  await requireInvoiceAccess(reqBuyerCross, resBuyerCross, () => { nextBuyerCross = true; });

  assert.equal(nextBuyerCross, false);
  assert.equal(resBuyerCross.statusCode, 404, 'Unrelated buyer guessing invoice must return 404');

  // Scenario 3: Public / unauthenticated user without token -> returns 401
  const reqPublicNoToken = {
    params: { invoiceId: INVOICE_A },
    user: null,
  };
  const resPublicNoToken = responseHelper();
  let nextPublicNoToken = false;
  await requireInvoiceAccess(reqPublicNoToken, resPublicNoToken, () => { nextPublicNoToken = true; });

  assert.equal(nextPublicNoToken, false);
  assert.equal(resPublicNoToken.statusCode, 401, 'Public invoice access without token must return 401');

  // Scenario 4: Public user with unapproved token in Release 1 -> returns 401 (remains unavailable)
  const reqPublicToken = {
    params: { invoiceId: INVOICE_A },
    query: { token: 'guessed-token-value' },
    user: null,
  };
  const resPublicToken = responseHelper();
  let nextPublicToken = false;
  await requireInvoiceAccess(reqPublicToken, resPublicToken, () => { nextPublicToken = true; });

  assert.equal(nextPublicToken, false);
  assert.equal(resPublicToken.statusCode, 401);
  assert.match(resPublicToken.body.error, /not enabled/);

  // Scenario 5: Store Owner A accessing own Invoice A -> succeeds (200)
  const reqOwner = {
    params: { invoiceId: INVOICE_A },
    user: { id: OWNER_A, type: 'user', role: 'merchant' },
  };
  const resOwner = responseHelper();
  let nextOwner = false;
  await requireInvoiceAccess(reqOwner, resOwner, () => { nextOwner = true; });

  assert.equal(nextOwner, true, 'Store owner must be permitted to access own invoice PDF');

  // Scenario 6: Permitted Staff of Store A accessing Invoice A -> succeeds (200)
  const reqStaff = {
    params: { invoiceId: INVOICE_A },
    user: { id: 'staff-1', type: 'staff', merchantId: OWNER_A, permissions: ['invoices'] },
  };
  const resStaff = responseHelper();
  let nextStaff = false;
  await requireInvoiceAccess(reqStaff, resStaff, () => { nextStaff = true; });

  assert.equal(nextStaff, true, 'Permitted staff must be permitted to access invoice PDF');

  // Scenario 7: Unpermitted Staff of Store A accessing Invoice A -> 403 Forbidden
  const reqStaffUnpermitted = {
    params: { invoiceId: INVOICE_A },
    user: { id: 'staff-2', type: 'staff', merchantId: OWNER_A, permissions: ['products'] },
  };
  const resStaffUnpermitted = responseHelper();
  let nextStaffUnpermitted = false;
  await requireInvoiceAccess(reqStaffUnpermitted, resStaffUnpermitted, () => { nextStaffUnpermitted = true; });

  assert.equal(nextStaffUnpermitted, false);
  assert.equal(resStaffUnpermitted.statusCode, 403, 'Unpermitted staff of the store receives 403');
  assert.equal(resStaffUnpermitted.body.error, 'Store access denied');

  // Scenario 8: Buyer A who owns the order -> succeeds (200)
  const reqBuyerOwn = {
    params: { invoiceId: INVOICE_A },
    user: { id: BUYER_A, type: 'user' },
  };
  const resBuyerOwn = responseHelper();
  let nextBuyerOwn = false;
  await requireInvoiceAccess(reqBuyerOwn, resBuyerOwn, () => { nextBuyerOwn = true; });

  assert.equal(nextBuyerOwn, true, 'Buyer owning order must be permitted to view invoice');
});

test('P2-AUTHZ-002: Request Body Store Override Resistance on POS and Invoices', async () => {
  const { createPOSOrder, createInvoice } = require('../../modules/orders/OrderController');

  // Case 1: Attacker sends body targeting Store B when endpoint is mounted for Store A
  const reqSpoofedPOS = {
    params: { storeId: STORE_A },
    store: { storeId: STORE_A, ownerUserId: OWNER_A, status: 'active' },
    user: { id: OWNER_A, type: 'user', role: 'merchant' },
    body: {
      storeId: STORE_B, // attacker attempting cross-store selection
      merchantId: OWNER_B,
      items: [{ productId: 'prod-1', quantity: 1 }],
      paymentMethod: 'cash',
    },
  };
  const resSpoofedPOS = responseHelper();
  await createPOSOrder(reqSpoofedPOS, resSpoofedPOS);

  assert.equal(resSpoofedPOS.statusCode, 403);
  assert.equal(resSpoofedPOS.body.error, 'Cross-store body selection prohibited');

  // Case 2: Attacker sends body targeting merchant B on POS order
  const reqSpoofedMerchant = {
    params: { storeId: STORE_A },
    store: { storeId: STORE_A, ownerUserId: OWNER_A, status: 'active' },
    user: { id: OWNER_A, type: 'user', role: 'merchant' },
    body: {
      merchantId: OWNER_B,
      items: [{ productId: 'prod-1', quantity: 1 }],
      paymentMethod: 'cash',
    },
  };
  const resSpoofedMerchant = responseHelper();
  await createPOSOrder(reqSpoofedMerchant, resSpoofedMerchant);

  assert.equal(resSpoofedMerchant.statusCode, 403);
  assert.equal(resSpoofedMerchant.body.error, 'Cross-merchant body selection prohibited');
});

test('P2-AUTHZ-002: Platform Admin Operations Logging and Audit Trail', async (t) => {
  const recordedAudits = [];
  t.mock.method(logger, 'info', (msg, meta) => {
    if (meta?.auditEvent) recordedAudits.push({ msg, meta });
  });

  // Test requirePlatformAdmin middleware
  const reqAdmin = {
    user: { id: 'admin-super', type: 'user', role: 'admin' },
    originalUrl: '/ecommerce/stats/admin',
    method: 'GET',
  };
  const resAdmin = responseHelper();
  let nextAdmin = false;
  requirePlatformAdmin(reqAdmin, resAdmin, () => { nextAdmin = true; });

  assert.equal(nextAdmin, true);
  const audit = recordedAudits.find(a => a.meta?.auditEvent === 'ADMIN_OPERATION');
  assert.ok(audit, 'Platform admin action must produce ADMIN_OPERATION audit event');
  assert.equal(audit.meta.adminUserId, 'admin-super');

  // Non-admin receives 403
  const reqNonAdmin = {
    user: { id: OWNER_A, type: 'user', role: 'merchant' },
    originalUrl: '/ecommerce/stats/admin',
    method: 'GET',
  };
  const resNonAdmin = responseHelper();
  let nextNonAdmin = false;
  requirePlatformAdmin(reqNonAdmin, resNonAdmin, () => { nextNonAdmin = true; });

  assert.equal(nextNonAdmin, false);
  assert.equal(resNonAdmin.statusCode, 403);
});
