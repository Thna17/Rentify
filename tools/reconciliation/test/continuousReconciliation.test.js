'use strict';

// tools/reconciliation/test/continuousReconciliation.test.js
// P3-REC-001: Comprehensive tests for the Continuous Reconciliation Suite.
// Verifies clean data, zero-data, explained differences, and intentionally corrupted fixtures across 15 domains.

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  runReconciliationSuite,
  VERDICTS,
  DOMAIN_STATUS,
  DOMAINS,
  DOMAIN_METADATA,
  UnsafeReconciliationError,
  validateSafeConnection,
  redactSensitiveData,
  sampleSafeIdentifiers,
} = require('../index');

const { createInMemoryModelAdapter } = require('../../fixtures/inMemoryAdapter');

// Helper to create both Core and Commerce mock models
function setupMockModels() {
  const coreModels = createInMemoryModelAdapter([
    'Store',
    'Website',
    'User',
    'Subscription',
    'Package',
    'PaymentAttempt',
    'ProviderEvent',
    'EventOutbox',
  ]);

  const commerceModels = createInMemoryModelAdapter([
    'StoreAccess',
    'WebsiteData',
    'Product',
    'ProductCategory',
    'ProductVariant',
    'InventoryBalance',
    'InventoryLedgerEntry',
    'InventoryReservation',
    'Cart',
    'CartItem',
    'Order',
    'OrderItem',
    'Payment',
    'Refund',
    'OrderEvent',
  ]);

  return { coreModels, commerceModels };
}

// Helper to seed a 100% clean, consistent platform scenario across all 15 domains
async function seedCleanScenario(coreModels, commerceModels, now = new Date()) {
  const storeId = '10000000-0000-4000-8000-000000000001';
  const websiteId = '30000000-0000-4000-8000-000000000001';
  const productId = '90000000-0000-4000-8000-000000000001';
  const skuId = '91000000-0000-4000-8000-000000000001';
  const cartId = 'a0000000-0000-4000-8000-000000000001';
  const orderId = 'b0000000-0000-4000-8000-000000000001';
  const paymentId = 'c0000000-0000-4000-8000-000000000001';
  const refundId = 'd0000000-0000-4000-8000-000000000001';
  const attemptId = 'e0000000-0000-4000-8000-000000000001';
  const eventId = 'f0000000-0000-4000-8000-000000000001';
  const resId = '80000000-0000-4000-8000-000000000001';

  // Domain 1 & 2: Core Store & Commerce StoreAccess
  await coreModels.Store.create({
    id: storeId,
    name: 'Khmer Handicrafts',
    slug: 'khmer-handicrafts',
    status: 'active',
    sellerStatus: 'approved',
    primaryCategory: 'crafts',
    subscriptionTier: 'marketplace_pilot',
  });

  await commerceModels.StoreAccess.create({
    id: 'sa-001',
    storeId,
    slug: 'khmer-handicrafts',
    status: 'active',
    sellerStatus: 'approved',
    primaryCategory: 'crafts',
    websiteId,
  });

  // Domain 3: Website-to-Store mapping
  await commerceModels.WebsiteData.create({
    id: websiteId,
    websiteId,
    storeId,
    domain: 'handicrafts.rentifystore.shop',
    status: 'active',
  });

  await coreModels.Website.create({
    id: websiteId,
    storeId,
    domain: 'handicrafts.rentifystore.shop',
    status: 'active',
  });

  // Domain 4 & 5: Published Catalog, Products & SKUs
  await commerceModels.Product.create({
    id: productId,
    storeId,
    name: 'Handwoven Silk Scarf',
    status: 'published',
    marketplaceVisible: true,
    hasVariants: 0,
    stock: 10,
  });

  await commerceModels.ProductVariant.create({
    id: skuId,
    productId,
    storeId,
    sku: 'SILK-SCARF-01',
    barcode: '885000111222',
    isDefault: 1,
    stock: 10,
    price: '25.00',
  });

  // Domain 6: Canonical Inventory ledger and balances
  await commerceModels.InventoryBalance.create({
    id: 'ib-001',
    storeId,
    skuId,
    onHand: 15,
    reserved: 5,
    available: 10,
  });

  await commerceModels.InventoryLedgerEntry.create({
    id: 'ile-001',
    storeId,
    skuId,
    changeOnHand: 15,
    changeReserved: 5,
    reasonCode: 'initial_stock_and_reservation',
    createdAt: new Date(now.getTime() - 100000),
  });

  // Domain 7: Compatibility stock fields (ProductVariant.stock matches available=10)
  // already set stock: 10 on ProductVariant

  // Domain 8: Reservations
  await commerceModels.InventoryReservation.create({
    id: resId,
    storeId,
    skuId,
    quantity: 5,
    status: 'active',
    expiresAt: new Date(now.getTime() + 600000), // expires in 10 minutes (valid)
  });

  // Domain 9: Carts and orders (channel & store safe)
  await commerceModels.Cart.create({
    id: cartId,
    storeId,
    channel: 'storefront',
    websiteId,
    buyerId: 'buyer-001',
  });

  await commerceModels.CartItem.create({
    id: 'ci-001',
    cartId,
    storeId,
    skuId,
    quantity: 1,
  });

  // Domain 10: Order snapshots and totals
  await commerceModels.Order.create({
    id: orderId,
    storeId,
    buyerId: 'buyer-001',
    salesChannel: 'storefront',
    websiteId,
    subtotal: '25.00',
    shippingFee: '3.00',
    taxTotal: '0.00',
    discountTotal: '0.00',
    totalAmount: '28.00',
    currency: 'USD',
    status: 'completed',
    deliveryStatus: 'delivered',
    stockDeducted: 1,
    orderSnapshot: { version: '1.0', total: '28.00' },
  });

  await commerceModels.OrderItem.create({
    id: 'oi-001',
    orderId,
    storeId,
    productId,
    skuId,
    quantity: 1,
    price: '25.00',
    total: '25.00',
    currency: 'USD',
    lineSnapshot: { title: 'Handwoven Silk Scarf', price: '25.00' },
  });

  // Domain 11: Fulfillment State (completed order with stockDeducted=1 and delivered)

  // Domain 12: COD collections
  await commerceModels.Payment.create({
    id: paymentId,
    orderId,
    storeId,
    paymentMethod: 'COD',
    amount: '28.00',
    collectedAmount: '28.00',
    refundedAmount: '10.00',
    status: 'partially_refunded',
  });

  await commerceModels.OrderEvent.create({
    id: 'oe-001',
    orderId,
    type: 'collect_cod',
    amount: '28.00',
  });

  await commerceModels.OrderEvent.create({
    id: 'oe-002',
    orderId,
    type: 'confirm_refund',
    amount: '10.00',
  });

  // Domain 13: Refunds
  await commerceModels.Refund.create({
    id: refundId,
    paymentId,
    orderId,
    storeId,
    amount: '10.00',
    status: 'completed',
    merchantPayoutEvidence: 'payout-ref-trx-9988',
  });

  // Domain 14: Payment attempts and provider events
  await coreModels.PaymentAttempt.create({
    id: attemptId,
    businessType: 'subscription',
    businessReference: `sub-${storeId}`,
    accountType: 'subscription',
    accountRef: 'rentify_corp_sub',
    provider: 'cutluy',
    amount: '29.00',
    currency: 'USD',
    status: 'paid',
  });

  await coreModels.ProviderEvent.create({
    id: eventId,
    provider: 'cutluy',
    paymentAttemptId: attemptId,
    status: 'paid',
    amount: '29.00',
    currency: 'USD',
    createdAt: new Date(now.getTime() - 100000),
  });

  // Domain 15: Subscriptions and entitlements (marketplace_pilot tier without custom domain)
  // Already seeded in coreModels.Store
}

// -----------------------------------------------------------------------------
// TEST SUITE
// -----------------------------------------------------------------------------

test('P3-REC-001: 1. Safety assertions, connection guards, and data redaction', () => {
  // Throws if safe connection confirmation is omitted
  assert.throws(
    () => validateSafeConnection({}),
    (err) => err instanceof UnsafeReconciliationError && err.message.includes('explicit safe connection confirmation')
  );

  // Passes when safeConnection: true is passed
  const validated = validateSafeConnection({ safeConnection: true }, { host: 'localhost' });
  assert.equal(validated.safe, true);
  assert.equal(validated.readOnly, true);

  // Rejects production host patterns without confirmReadOnly
  assert.throws(
    () => validateSafeConnection({ safeConnection: true }, { host: 'production-db.rds.amazonaws.com' }),
    (err) => err instanceof UnsafeReconciliationError && err.message.includes('explicit read-only confirmation')
  );

  // Passes with production host when confirmReadOnly: true is provided
  const prodConfirmed = validateSafeConnection(
    { safeConnection: true, confirmReadOnly: true },
    { host: 'production-db.rds.amazonaws.com' }
  );
  assert.equal(prodConfirmed.safe, true);

  // Sensitive data redaction
  const dirty = {
    storeId: 'store-123',
    buyerName: 'Secret Buyer',
    customerName: 'Jane Doe',
    email: 'buyer@example.com',
    phone: '+85512345678',
    shippingAddress: { street: '123 River Road', city: 'Phnom Penh' },
    cardToken: 'tok_secret_123',
    qrPayload: 'qr-raw-payload-string',
    items: [
      { id: 'item-1', name: 'Scarf', password: 'plain-password' },
    ],
  };

  const clean = redactSensitiveData(dirty);
  assert.equal(clean.storeId, 'store-123');
  assert.equal(clean.buyerName, '[REDACTED]');
  assert.equal(clean.customerName, '[REDACTED]');
  assert.equal(clean.email, '[REDACTED]');
  assert.equal(clean.phone, '[REDACTED]');
  assert.equal(clean.shippingAddress, '[REDACTED]');
  assert.equal(clean.cardToken, '[REDACTED]');
  assert.equal(clean.qrPayload, '[REDACTED]');
  assert.equal(clean.items[0].password, '[REDACTED]');

  // Sample safe identifiers
  const samples = sampleSafeIdentifiers([
    { id: 'id-1', name: 'Unsafe' },
    { orderId: 'ord-123' },
    { sku: 'SKU-001' },
    { storeId: 'store-123' },
    { id: 'id-1' }, // duplicate
    'raw-uuid-555',
  ], 4);
  assert.deepEqual(samples, ['id-1', 'ord-123', 'SKU-001', 'store-123']);
});

test('P3-REC-001: 2. Clean data scenario: proves PROVEN_ZERO_DIFFERENCES across all 15 domains', async () => {
  const { coreModels, commerceModels } = setupMockModels();
  const now = new Date('2026-10-26T12:00:00.000Z');
  await seedCleanScenario(coreModels, commerceModels, now);

  const result = await runReconciliationSuite({
    coreModels,
    commerceModels,
    options: { safeConnection: true },
    now,
  });

  assert.equal(result.verdict, VERDICTS.PASS);
  assert.ok(result.runId.startsWith('rec-run-'));
  assert.equal(result.summary.totalDomainsAudited, 15);
  assert.equal(result.summary.provenZeroDifferencesCount, 15);
  assert.equal(result.summary.zeroDataCount, 0);
  assert.equal(result.summary.explainedDifferencesCount, 0);
  assert.equal(result.summary.unexplainedDifferencesCount, 0);
  assert.equal(result.summary.totalDefectsCount, 0);

  // Verify all 15 domain statuses
  for (const domain of result.domains) {
    assert.equal(
      domain.status,
      DOMAIN_STATUS.PROVEN_ZERO_DIFFERENCES,
      `Expected domain "${domain.name}" to report PROVEN_ZERO_DIFFERENCES`
    );
    assert.ok(domain.recordsInspected > 0, `Expected recordsInspected > 0 for ${domain.name}`);
    assert.equal(domain.defectsCount, 0);
  }

  // Verify human summary text
  assert.ok(result.humanSummary.includes('ALL VERIFIED INVARIANTS SATISFIED'));
  assert.ok(result.humanSummary.includes('Proven zero differences: 15'));

  // Verify machine-readable JSON snapshot
  const parsedJson = JSON.parse(result.json);
  assert.equal(parsedJson.verdict, 'PASS');
  assert.equal(parsedJson.summary.unexplainedDifferencesCount, 0);
});

test('P3-REC-001: 3. Zero-data scenario: correctly classifies ZERO_DATA_NO_EVIDENCE when records do not exist', async () => {
  const { coreModels, commerceModels } = setupMockModels();

  const result = await runReconciliationSuite({
    coreModels,
    commerceModels,
    options: { safeConnection: true },
  });

  assert.equal(result.verdict, VERDICTS.PASS);
  assert.equal(result.summary.totalDomainsAudited, 15);
  assert.equal(result.summary.zeroDataCount, 15);
  assert.equal(result.summary.provenZeroDifferencesCount, 0);
  assert.equal(result.summary.unexplainedDifferencesCount, 0);

  for (const domain of result.domains) {
    assert.equal(domain.status, DOMAIN_STATUS.ZERO_DATA_NO_EVIDENCE);
    assert.equal(domain.recordsInspected, 0);
    assert.equal(domain.defectsCount, 0);
  }

  assert.ok(result.humanSummary.includes('Zero-data / no evidence: 15'));
});

test('P3-REC-001: 4. Explained differences scenario: safely distinguishes explained transitions from defects', async () => {
  const { coreModels, commerceModels } = setupMockModels();
  const now = new Date('2026-10-26T12:00:00.000Z');
  const storeId = '10000000-0000-4000-8000-000000000001';

  // 1. Pending Outbox event for Store projection
  await coreModels.Store.create({
    id: storeId,
    name: 'Pending Sync Store',
    slug: 'pending-sync',
    status: 'active',
  });
  await coreModels.EventOutbox.create({
    id: 'outbox-1',
    aggregateType: 'Store',
    aggregateId: storeId,
    eventType: 'store.projected.v1',
    status: 'pending',
  });

  // 2. Reservation within 5-minute expiration grace window
  await commerceModels.InventoryReservation.create({
    id: 'res-grace-1',
    storeId,
    skuId: 'sku-1',
    quantity: 2,
    status: 'active',
    expiresAt: new Date(now.getTime() - 60000), // expired 1 minute ago (within 5min grace)
  });

  // 3. Subscription within 3-day billing grace period
  await coreModels.Subscription.create({
    id: 'sub-grace-1',
    storeId,
    status: 'past_due',
    endDate: new Date(now.getTime() - 24 * 60 * 60 * 1000), // expired 1 day ago (within 3day grace)
  });

  // 4. Compatibility stock update within in-flight window
  await commerceModels.ProductVariant.create({
    id: 'sku-compat-1',
    storeId,
    stock: 5,
  });
  await commerceModels.InventoryBalance.create({
    id: 'ib-compat-1',
    storeId,
    skuId: 'sku-compat-1',
    onHand: 10,
    reserved: 0,
    available: 10,
  });
  await commerceModels.InventoryLedgerEntry.create({
    id: 'ile-compat-1',
    storeId,
    skuId: 'sku-compat-1',
    changeOnHand: 10,
    changeReserved: 0,
    createdAt: new Date(now.getTime() - 2000), // 2 seconds ago (in-flight)
  });

  const result = await runReconciliationSuite({
    coreModels,
    commerceModels,
    options: { safeConnection: true },
    now,
  });

  // Explained differences must NOT cause audit to fail
  assert.equal(result.verdict, VERDICTS.PASS);
  assert.equal(result.summary.unexplainedDifferencesCount, 0);
  assert.ok(result.summary.explainedDifferencesCount >= 4);

  // Check specific domain classifications
  const dStore = result.domains.find((d) => d.id === DOMAINS.CORE_STORE_PROJECTIONS);
  assert.equal(dStore.status, DOMAIN_STATUS.EXPLAINED_DIFFERENCE);

  const dRes = result.domains.find((d) => d.id === DOMAINS.RESERVATIONS);
  assert.equal(dRes.status, DOMAIN_STATUS.EXPLAINED_DIFFERENCE);

  const dSub = result.domains.find((d) => d.id === DOMAINS.SUBSCRIPTIONS_ENTITLEMENTS);
  assert.equal(dSub.status, DOMAIN_STATUS.EXPLAINED_DIFFERENCE);

  const dCompat = result.domains.find((d) => d.id === DOMAINS.COMPATIBILITY_STOCK_FIELDS);
  assert.equal(dCompat.status, DOMAIN_STATUS.EXPLAINED_DIFFERENCE);
});

test('P3-REC-001: 5. Intentionally corrupted fixtures: verifies defect detection, owning package, and failure verdict', async (t) => {
  // Test corrupted fixtures across all 15 domains
  const domainCorruptionCases = [
    {
      domainId: DOMAINS.CORE_STORE_PROJECTIONS,
      expectedPackage: 'rentify-server:commerce-sync',
      corrupt: async (c, m) => {
        await c.Store.create({ id: 'bad-store-1', name: 'Bad Store', slug: 'bad-store', status: 'active' });
        // No StoreAccess and no outbox event
      },
    },
    {
      domainId: DOMAINS.COMMERCE_STORE_ACCESS,
      expectedPackage: 'ecommerce-server:store-access',
      corrupt: async (c, m) => {
        await m.StoreAccess.create({ id: 'sa-orphan-1', storeId: 'ghost-store-999', slug: 'ghost' });
        // ghost-store-999 does not exist in Core
      },
    },
    {
      domainId: DOMAINS.WEBSITE_STORE_MAPPINGS,
      expectedPackage: 'ecommerce-server:websites',
      corrupt: async (c, m) => {
        await m.WebsiteData.create({ id: 'web-bad-1', websiteId: 'web-bad-1', storeId: null });
      },
    },
    {
      domainId: DOMAINS.PUBLISHED_CATALOG,
      expectedPackage: 'ecommerce-server:catalog',
      corrupt: async (c, m) => {
        const sId = 'store-unapproved-1';
        await m.StoreAccess.create({ id: 'sa-1', storeId: sId, status: 'active', sellerStatus: 'pending' });
        await m.Product.create({ id: 'prod-ineligible-1', storeId: sId, status: 'published', marketplaceVisible: true });
      },
    },
    {
      domainId: DOMAINS.PRODUCTS_AND_SKUS,
      expectedPackage: 'ecommerce-server:catalog',
      corrupt: async (c, m) => {
        const sId = 'store-sku-err-1';
        await m.Product.create({ id: 'p-simple-no-sku', storeId: sId, name: 'Simple No SKU', hasVariants: 0 });
        await m.ProductVariant.create({ id: 'v-not-default', productId: 'p-simple-no-sku', storeId: sId, isDefault: 0 });
      },
    },
    {
      domainId: DOMAINS.INVENTORY_LEDGER_BALANCES,
      expectedPackage: 'ecommerce-server:inventory',
      corrupt: async (c, m) => {
        const sId = 'store-inv-bad-1';
        await m.InventoryBalance.create({ id: 'ib-neg-1', storeId: sId, skuId: 'sku-neg-1', onHand: -5, reserved: 0, available: -5 });
      },
    },
    {
      domainId: DOMAINS.COMPATIBILITY_STOCK_FIELDS,
      expectedPackage: 'ecommerce-server:inventory',
      corrupt: async (c, m) => {
        const sId = 'store-compat-bad-1';
        await m.ProductVariant.create({ id: 'var-divergent-1', storeId: sId, stock: 100 });
        await m.InventoryBalance.create({ id: 'ib-div-1', storeId: sId, skuId: 'var-divergent-1', onHand: 10, reserved: 0, available: 10 });
        // Stale ledger entry from hours ago
        await m.InventoryLedgerEntry.create({
          id: 'ile-old-1',
          storeId: sId,
          skuId: 'var-divergent-1',
          changeOnHand: 10,
          changeReserved: 0,
          createdAt: new Date('2026-10-25T00:00:00.000Z'),
        });
      },
    },
    {
      domainId: DOMAINS.RESERVATIONS,
      expectedPackage: 'ecommerce-server:inventory',
      corrupt: async (c, m) => {
        const sId = 'store-res-bad-1';
        await m.InventoryReservation.create({
          id: 'res-stale-past-grace-1',
          storeId: sId,
          skuId: 'sku-stale-1',
          quantity: 3,
          status: 'active',
          expiresAt: new Date('2026-10-26T11:00:00.000Z'), // expired 1 hour ago (past 5m grace)
        });
      },
    },
    {
      domainId: DOMAINS.CARTS_AND_ORDERS,
      expectedPackage: 'ecommerce-server:cart',
      corrupt: async (c, m) => {
        await m.Cart.create({ id: 'cart-bad-1', channel: 'storefront', storeId: 'store-a', websiteId: 'web-1' });
        await m.CartItem.create({ id: 'ci-bad-1', cartId: 'cart-bad-1', storeId: 'store-b', skuId: 'sku-b', quantity: 1 });
      },
    },
    {
      domainId: DOMAINS.ORDER_SNAPSHOTS_TOTALS,
      expectedPackage: 'ecommerce-server:orders',
      corrupt: async (c, m) => {
        await m.Order.create({
          id: 'ord-bad-math-1',
          storeId: 'store-1',
          subtotal: '20.00',
          shippingFee: '5.00',
          totalAmount: '99.00', // expected 25.00
          currency: 'USD',
          orderSnapshot: { total: '99.00' },
        });
      },
    },
    {
      domainId: DOMAINS.FULFILLMENT_STATE,
      expectedPackage: 'ecommerce-server:orders',
      corrupt: async (c, m) => {
        await m.Order.create({
          id: 'ord-cancelled-unreleased-1',
          storeId: 'store-1',
          status: 'cancelled',
          stockDeducted: 1, // failed to restore stock
        });
      },
    },
    {
      domainId: DOMAINS.COD_COLLECTIONS,
      expectedPackage: 'ecommerce-server:payments',
      corrupt: async (c, m) => {
        await m.Payment.create({
          id: 'pay-cod-bad-1',
          paymentMethod: 'COD',
          amount: '50.00',
          collectedAmount: '100.00', // exceeds due
          status: 'paid',
        });
      },
    },
    {
      domainId: DOMAINS.REFUNDS,
      expectedPackage: 'ecommerce-server:payments',
      corrupt: async (c, m) => {
        await m.Payment.create({
          id: 'pay-ref-parent-1',
          collectedAmount: '20.00',
          refundedAmount: '50.00', // exceeds collected
        });
        await m.Refund.create({
          id: 'ref-exceed-1',
          paymentId: 'pay-ref-parent-1',
          amount: '50.00',
          status: 'completed',
          merchantPayoutEvidence: 'payout-evidence-1',
        });
      },
    },
    {
      domainId: DOMAINS.PAYMENT_ATTEMPTS_EVENTS,
      expectedPackage: 'rentify-server:billing',
      corrupt: async (c, m) => {
        await c.PaymentAttempt.create({
          id: 'att-khr-1',
          businessType: 'subscription',
          currency: 'KHR', // forbidden currency
          amount: '50000',
          status: 'pending',
        });
      },
    },
    {
      domainId: DOMAINS.SUBSCRIPTIONS_ENTITLEMENTS,
      expectedPackage: 'rentify-server:billing',
      corrupt: async (c, m) => {
        await c.Store.create({
          id: 'store-pilot-custom-domain-1',
          name: 'Pilot Violator',
          tier: 'marketplace_pilot',
          customDomain: 'custom.mybrand.com', // forbidden on pilot tier
        });
      },
    },
  ];

  for (const tc of domainCorruptionCases) {
    await t.test(`corrupted fixture: domain "${tc.domainId}" fails closed`, async () => {
      const { coreModels, commerceModels } = setupMockModels();
      const now = new Date('2026-10-26T12:00:00.000Z');

      await tc.corrupt(coreModels, commerceModels);

      const result = await runReconciliationSuite({
        coreModels,
        commerceModels,
        options: { safeConnection: true },
        now,
      });

      assert.equal(result.verdict, VERDICTS.FAIL, `Expected audit to FAIL on corrupted ${tc.domainId}`);
      assert.ok(result.summary.unexplainedDifferencesCount >= 1);

      const targetDomain = result.domains.find((d) => d.id === tc.domainId);
      assert.ok(targetDomain, `Domain ${tc.domainId} not found in results`);
      assert.equal(targetDomain.status, DOMAIN_STATUS.UNEXPLAINED_DIFFERENCE);
      assert.ok(targetDomain.defectsCount >= 1);
      assert.equal(targetDomain.suggestedOwningPackage, tc.expectedPackage);
      assert.ok(targetDomain.sampledSafeIdentifiers.length > 0);
      assert.ok(targetDomain.operatorGuidance.length > 0);

      // Verify human summary highlights the failure and owning package
      assert.ok(result.humanSummary.includes('FAIL - UNEXPLAINED DIFFERENCES DETECTED'));
      assert.ok(result.humanSummary.includes(tc.expectedPackage));
    });
  }
});

test('P3-REC-001: 6. Store-scoped audit vs platform-wide audit', async () => {
  const { coreModels, commerceModels } = setupMockModels();
  const now = new Date('2026-10-26T12:00:00.000Z');

  const storeA = '10000000-0000-4000-8000-00000000000a';
  const storeB = '10000000-0000-4000-8000-00000000000b';

  // Store A: clean
  await coreModels.Store.create({ id: storeA, name: 'Store A', slug: 'store-a', status: 'active' });
  await commerceModels.StoreAccess.create({ id: 'sa-a', storeId: storeA, slug: 'store-a', status: 'active' });

  // Store B: corrupted (missing StoreAccess)
  await coreModels.Store.create({ id: storeB, name: 'Store B', slug: 'store-b', status: 'active' });

  // Run audit scoped to Store A: should PASS
  const resultA = await runReconciliationSuite({
    coreModels,
    commerceModels,
    storeId: storeA,
    options: { safeConnection: true },
    now,
  });
  assert.equal(resultA.verdict, VERDICTS.PASS);
  assert.equal(resultA.scope.type, 'store');
  assert.equal(resultA.scope.storeId, storeA);

  // Run audit platform-wide: should FAIL due to Store B corruption
  const resultPlatform = await runReconciliationSuite({
    coreModels,
    commerceModels,
    options: { safeConnection: true },
    now,
  });
  assert.equal(resultPlatform.verdict, VERDICTS.FAIL);
  assert.equal(resultPlatform.scope.type, 'platform');
  assert.ok(resultPlatform.summary.unexplainedDifferencesCount >= 1);
});

test('P3-REC-001: 7. Never mutates production records: proves zero writes/updates during audit', async () => {
  const { coreModels, commerceModels } = setupMockModels();
  const now = new Date('2026-10-26T12:00:00.000Z');
  await seedCleanScenario(coreModels, commerceModels, now);

  // Take snapshot of record counts
  const countBefore = {
    stores: coreModels.Store._records.length,
    products: commerceModels.Product._records.length,
    variants: commerceModels.ProductVariant._records.length,
    balances: commerceModels.InventoryBalance._records.length,
    orders: commerceModels.Order._records.length,
    payments: commerceModels.Payment._records.length,
  };

  // Run suite
  await runReconciliationSuite({
    coreModels,
    commerceModels,
    options: { safeConnection: true },
    now,
  });

  // Verify counts remain unchanged
  assert.equal(coreModels.Store._records.length, countBefore.stores);
  assert.equal(commerceModels.Product._records.length, countBefore.products);
  assert.equal(commerceModels.ProductVariant._records.length, countBefore.variants);
  assert.equal(commerceModels.InventoryBalance._records.length, countBefore.balances);
  assert.equal(commerceModels.Order._records.length, countBefore.orders);
  assert.equal(commerceModels.Payment._records.length, countBefore.payments);
});
