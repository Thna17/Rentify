// test/security/moneyOrderSnapshots.test.js
// Verification suite for P3-MNY-001: Money representation and immutable order snapshots.

const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Sequelize } = require('sequelize');

Sequelize.prototype.authenticate = async () => {};
Sequelize.prototype.validate = async () => {};

const { sequelize } = require('../../config/db');
sequelize.authenticate = async () => {};
sequelize.validate = async () => {};

const {
  Order,
  OrderItem,
  Product,
  ProductVariant,
  Cart,
  CartItem,
  StoreAccess,
  StoreDeliveryPolicy,
  Payment,
  WebsiteData,
} = require('../../models');

const {
  Money,
  parseMinor,
  formatDecimal,
  assertSupportedOnlineCurrency,
  assertNoSilentConversion,
  CurrencyMismatchError,
  InvalidMoneyError,
  UnsupportedCurrencyError,
} = require('../../utils/money');

const checkoutService = require('../../modules/checkout/marketplaceCheckoutService');
const { cents, dollars } = require('../../modules/checkout/marketplaceRules');
const { audit } = require('../../scripts/auditOrderSnapshots');
const migration015 = require('../../migrations/20261025_015_order_money_snapshots');

const STORE_A = '11111111-1111-4111-8111-111111111111';
const STORE_B = '22222222-2222-4222-8222-222222222222';
const BUYER_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const BUYER_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const mockStoreAccessA = {
  storeId: STORE_A,
  status: 'active',
  displayName: 'Angkor Silk Crafts',
  marketplaceApprovalStatus: 'approved',
  marketplaceEnabled: true,
  marketplaceEntitlement: 'pilot',
  needsCategoryReview: false,
};

const mockDeliveryPolicyA = {
  storeId: STORE_A,
  flatFee: '5.00',
  currency: 'USD',
  version: 2,
};

test('P3-MNY-001: 1. Canonical Money: exact arithmetic, minor units, and rounding boundaries', () => {
  // 1.1 Exact decimal parsing without floating-point drift (0.10 + 0.20 === 0.30)
  const m1 = Money.fromDecimal('0.10', 'USD');
  const m2 = Money.fromDecimal('0.20', 'USD');
  const sum = m1.add(m2);

  assert.equal(m1.amountMinor, 10);
  assert.equal(m2.amountMinor, 20);
  assert.equal(sum.amountMinor, 30);
  assert.equal(sum.amount, '0.30');

  // 1.2 Integer multiplication with deterministic half-up rounding
  const unit = Money.fromDecimal('15.55', 'USD');
  const triple = unit.multiply(3);
  assert.equal(triple.amountMinor, 4665);
  assert.equal(triple.amount, '46.65');

  // 1.3 Subtraction
  const remaining = triple.subtract(unit);
  assert.equal(remaining.amountMinor, 3110);
  assert.equal(remaining.amount, '31.10');

  // 1.4 Formatting edge cases
  assert.equal(formatDecimal(0, 'USD'), '0.00');
  assert.equal(formatDecimal(5, 'USD'), '0.05');
  assert.equal(formatDecimal(50, 'USD'), '0.50');
  assert.equal(formatDecimal(1005, 'USD'), '10.05');

  // 1.5 JSON serialization
  const json = m1.toJSON();
  assert.deepEqual(json, { amount: '0.10', amountMinor: 10, currency: 'USD' });
});

test('P3-MNY-001: 2. Malicious Totals: Server is authoritative, client totals are comparison hints', async (t) => {
  t.mock.method(sequelize, 'transaction', async (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  t.mock.method(StoreAccess, 'findByPk', async () => mockStoreAccessA);
  t.mock.method(StoreDeliveryPolicy, 'findByPk', async () => mockDeliveryPolicyA);
  t.mock.method(Order, 'findOne', async () => null);

  const cartId = randomUUID();
  const productId = randomUUID();

  t.mock.method(Cart, 'findOne', async () => ({ id: cartId, buyerId: BUYER_A, storeId: STORE_A }));
  t.mock.method(CartItem, 'findAll', async () => [
    { id: 'ci-1', cartId, productId, quantity: 2, variantId: null },
  ]);

  const mockProduct = {
    id: productId,
    storeId: STORE_A,
    name: 'Silk Pillowcase',
    slug: 'silk-pillowcase',
    price: '20.00',
    currency: 'USD',
    trackInventory: false,
    status: 'active',
    marketplaceCategory: 'Clothing',
    marketplaceVisibility: true,
    version: 1,
  };
  t.mock.method(Product, 'findByPk', async () => mockProduct);

  // Client attempts to cheat by providing expectedTotalAmount of $0.01 instead of $45.00 ($40 + $5 delivery)
  await assert.rejects(
    checkoutService.checkout({
      buyerId: BUYER_A,
      storeId: STORE_A,
      checkoutKey: 'idemp-malicious-total-1',
      expectedTotalAmount: '0.01',
      customerInfo: { name: 'Honest Buyer', phone: '+85512345678' },
      shippingInfo: { address: '123 Street, Phnom Penh' },
    }),
    (err) => {
      assert.equal(err.statusCode, 409);
      assert.equal(err.code, 'TOTAL_MISMATCH');
      assert.match(err.message, /Cart price or delivery fee changed/);
      assert.equal(err.details.expectedTotal, '0.01');
      assert.equal(err.details.calculatedTotal, '45.00');
      assert.equal(err.details.subtotal, '40.00');
      assert.equal(err.details.deliveryFee, '5.00');
      assert.equal(err.details.currency, 'USD');
      return true;
    }
  );
});

test('P3-MNY-001: 3. Stale Totals: Changed price returns stable buyer-review payload', async (t) => {
  t.mock.method(sequelize, 'transaction', async (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  t.mock.method(StoreAccess, 'findByPk', async () => mockStoreAccessA);
  t.mock.method(StoreDeliveryPolicy, 'findByPk', async () => mockDeliveryPolicyA); // delivery $5.00
  t.mock.method(Order, 'findOne', async () => null);

  const cartId = randomUUID();
  const productId = randomUUID();

  t.mock.method(Cart, 'findOne', async () => ({ id: cartId, buyerId: BUYER_A, storeId: STORE_A }));
  t.mock.method(CartItem, 'findAll', async () => [
    { id: 'ci-1', cartId, productId, quantity: 1, variantId: null },
  ]);

  // Product price was updated to $25.00 by seller, buyer thought it was $20.00
  const updatedProduct = {
    id: productId,
    storeId: STORE_A,
    name: 'Handmade Lotus Tea',
    slug: 'handmade-lotus-tea',
    price: '25.00',
    currency: 'USD',
    trackInventory: false,
    status: 'active',
    marketplaceCategory: 'Food & Beverage',
    marketplaceVisibility: true,
    version: 2,
  };
  t.mock.method(Product, 'findByPk', async () => updatedProduct);

  // Buyer submits stale expectation: $20 item + $5 delivery = $25.00
  await assert.rejects(
    checkoutService.checkout({
      buyerId: BUYER_A,
      storeId: STORE_A,
      checkoutKey: 'idemp-stale-total-2',
      expectedTotalAmount: '25.00',
      customerInfo: { name: 'Tea Lover', phone: '+85512345678' },
      shippingInfo: { address: 'Wat Phnom, Phnom Penh' },
    }),
    (err) => {
      assert.equal(err.statusCode, 409);
      assert.equal(err.code, 'TOTAL_MISMATCH');
      assert.equal(err.details.expectedTotal, '25.00');
      assert.equal(err.details.calculatedTotal, '30.00'); // 25 + 5
      assert.equal(err.details.subtotal, '25.00');
      assert.equal(err.details.deliveryFee, '5.00');
      return true;
    }
  );
});

test('P3-MNY-001: 4. Large Values & Ceilings: Safe integer limits and overflow rejection', () => {
  // 4.1 Large valid value
  const large = Money.fromDecimal('999999.99', 'USD');
  assert.equal(large.amountMinor, 99999999);
  assert.equal(large.amount, '999999.99');

  // 4.2 Rejection of scientific notation
  assert.throws(
    () => parseMinor('1e6', 'USD'),
    (err) => err instanceof InvalidMoneyError && /scientific notation prohibited/.test(err.message)
  );

  // 4.3 Rejection of excessive scale (> 2 decimal places for USD)
  assert.throws(
    () => parseMinor('10.999', 'USD'),
    (err) => err instanceof InvalidMoneyError && /exceeds maximum allowed scale/.test(err.message)
  );

  // 4.4 Delivery fee ceiling ($1000.00 max)
  const { deliveryFeeCents } = require('../../modules/checkout/marketplaceRules');
  assert.equal(deliveryFeeCents('10.00'), 1000);
  assert.throws(
    () => deliveryFeeCents('1000.01'),
    (err) => err.statusCode === 400 && /no more than 1000.00/.test(err.message)
  );
});

test('P3-MNY-001: 5. Negative Values: Prohibited across all authoritative calculations', () => {
  assert.throws(
    () => parseMinor('-15.00', 'USD'),
    (err) => err instanceof InvalidMoneyError && /Negative monetary amounts are prohibited/.test(err.message)
  );

  assert.throws(
    () => parseMinor('-0.01', 'USD'),
    (err) => err instanceof InvalidMoneyError && /Negative monetary amounts are prohibited/.test(err.message)
  );

  assert.throws(
    () => cents('-20.00'),
    (err) => err.statusCode === 409
  );
});

test('P3-MNY-001: 6. KHR Policy: Disabled for online checkout, zero silent conversion', () => {
  // 6.1 Online checkout currency guard rejects KHR with clear code
  assert.throws(
    () => assertSupportedOnlineCurrency('KHR'),
    (err) => err instanceof UnsupportedCurrencyError && err.code === 'KHR_CHECKOUT_DISABLED'
  );

  // 6.2 USD is accepted
  assert.equal(assertSupportedOnlineCurrency('USD'), 'USD');

  // 6.3 Cross-currency operation throws CurrencyMismatchError (cannot silently convert)
  const usdMoney = Money.fromDecimal('10.00', 'USD');
  const khrMoney = Money.fromDecimal('40000', 'KHR');

  assert.throws(
    () => usdMoney.add(khrMoney),
    (err) => err instanceof CurrencyMismatchError
  );

  assert.throws(
    () => assertNoSilentConversion('USD', 'KHR'),
    (err) => err instanceof CurrencyMismatchError
  );
});

test('P3-MNY-001: 7. Immutable Order & Line Snapshots: Creation and Historical Stability', async (t) => {
  t.mock.method(sequelize, 'transaction', async (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  t.mock.method(StoreAccess, 'findByPk', async () => mockStoreAccessA);
  t.mock.method(StoreDeliveryPolicy, 'findByPk', async () => mockDeliveryPolicyA);
  t.mock.method(Order, 'findOne', async () => null);

  const cartId = randomUUID();
  const productId = randomUUID();
  const variantId = randomUUID();

  t.mock.method(Cart, 'findOne', async () => ({ id: cartId, buyerId: BUYER_A, storeId: STORE_A }));
  t.mock.method(CartItem, 'findAll', async () => [
    { id: 'ci-1', cartId, productId, variantId, quantity: 2 },
  ]);

  const originalProduct = {
    id: productId,
    storeId: STORE_A,
    name: 'Original Handcrafted Silk Scarf',
    slug: 'original-silk-scarf',
    price: '30.00',
    currency: 'USD',
    trackInventory: false,
    status: 'active',
    marketplaceCategory: 'Clothing',
    marketplaceVisibility: true,
    version: 1,
  };

  const originalVariant = {
    id: variantId,
    productId,
    storeId: STORE_A,
    sku: 'SCARF-SILK-RED',
    barcode: '8850123456789',
    price: '30.00',
    currency: 'USD',
    trackInventory: false,
    stockQuantity: 10,
    optionValues: { Color: 'Red', Size: 'M' },
    status: 'active',
  };

  t.mock.method(Product, 'findByPk', async () => originalProduct);
  t.mock.method(ProductVariant, 'findOne', async () => originalVariant);

  let savedOrder = null;
  let savedLine = null;

  t.mock.method(Order, 'create', async (data) => {
    savedOrder = { id: randomUUID(), ...data, createdAt: new Date() };
    return savedOrder;
  });

  t.mock.method(OrderItem, 'create', async (data) => {
    savedLine = { id: randomUUID(), ...data };
    return savedLine;
  });

  t.mock.method(Payment, 'create', async (data) => ({ id: randomUUID(), ...data }));
  t.mock.method(CartItem, 'destroy', async () => 1);
  t.mock.method(Cart, 'destroy', async () => 1);

  // Subtotal = 2 * $30.00 = $60.00, Delivery = $5.00, Total = $65.00
  const orderResult = await checkoutService.checkout({
    buyerId: BUYER_A,
    storeId: STORE_A,
    checkoutKey: 'idemp-snapshot-test-7',
    expectedTotalAmount: '65.00',
    customerInfo: { name: 'Sophea Chem', phone: '+85598765432' },
    shippingInfo: { address: 'St 214, Phnom Penh' },
  });

  // Verify created order
  assert.ok(orderResult);
  assert.equal(orderResult.totalAmount, '65.00');
  assert.equal(orderResult.deliveryFee, '5.00');
  assert.equal(orderResult.subtotal, '60.00');

  // Verify Immutable Order Snapshot
  assert.ok(savedOrder.orderSnapshot, 'Order must contain orderSnapshot');
  const snap = savedOrder.orderSnapshot;
  assert.equal(snap.storeId, STORE_A);
  assert.equal(snap.storeName, 'Angkor Silk Crafts');
  assert.equal(snap.salesChannel, 'marketplace');
  assert.equal(snap.currency, 'USD');
  assert.equal(snap.subtotal, '60.00');
  assert.equal(snap.subtotalMinor, 6000);
  assert.equal(snap.deliveryFee, '5.00');
  assert.equal(snap.deliveryFeeMinor, 500);
  assert.equal(snap.taxTotal, '0.00');
  assert.equal(snap.taxTotalMinor, 0);
  assert.equal(snap.totalAmount, '65.00');
  assert.equal(snap.totalAmountMinor, 6500);
  assert.equal(snap.deliveryPolicyVersion, 2);
  assert.equal(snap.policyVersions.tax, 'release-1-zero-tax');

  // Verify Immutable Line Snapshot
  assert.ok(savedLine.lineSnapshot, 'OrderItem must contain lineSnapshot');
  const lineSnap = savedLine.lineSnapshot;
  assert.equal(lineSnap.productId, productId);
  assert.equal(lineSnap.productName, 'Original Handcrafted Silk Scarf');
  assert.equal(lineSnap.variantId, variantId);
  assert.equal(lineSnap.sku, 'SCARF-SILK-RED');
  assert.equal(lineSnap.barcode, '8850123456789');
  assert.deepEqual(lineSnap.attributes, { Color: 'Red', Size: 'M' });
  assert.equal(lineSnap.unitPrice, '30.00');
  assert.equal(lineSnap.unitPriceMinor, 3000);
  assert.equal(lineSnap.quantity, 2);
  assert.equal(lineSnap.total, '60.00');
  assert.equal(lineSnap.totalMinor, 6000);

  // HISTORICAL STABILITY CHECK:
  // Now simulate that the product catalog changes tomorrow:
  // Product is renamed, price increases to $100.00, delivery fee policy increases to $20.00
  originalProduct.name = 'Altered Product Name';
  originalProduct.price = '100.00';
  mockDeliveryPolicyA.flatFee = '20.00';

  // Order view fetched later
  const { orderView } = require('../../modules/checkout/marketplaceRules');
  const historicalView = orderView(savedOrder, [savedLine], null);

  // Historical order must remain 100% stable
  assert.equal(historicalView.totalAmount, '65.00', 'Historical total amount never changes');
  assert.equal(historicalView.deliveryFee, '5.00', 'Historical delivery fee never changes');
  assert.equal(historicalView.subtotal, '60.00', 'Historical subtotal never changes');
  assert.equal(historicalView.items[0].name, 'Original Handcrafted Silk Scarf', 'Historical line name never changes');
  assert.equal(historicalView.items[0].price, '30.00', 'Historical line price never changes');
  assert.equal(historicalView.snapshot.totalAmount, '65.00');
  assert.equal(historicalView.items[0].snapshot.unitPrice, '30.00');
});

test('P3-MNY-001: 8. Store Isolation: Store A cannot access Store B order snapshots or inject items', async (t) => {
  t.mock.method(sequelize, 'transaction', async (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  t.mock.method(StoreAccess, 'findByPk', async (id) => (id === STORE_A ? mockStoreAccessA : null));
  t.mock.method(StoreDeliveryPolicy, 'findByPk', async () => mockDeliveryPolicyA);
  t.mock.method(Order, 'findOne', async () => null);

  const cartId = randomUUID();
  const foreignProductId = randomUUID();

  t.mock.method(Cart, 'findOne', async () => ({ id: cartId, buyerId: BUYER_A, storeId: STORE_A }));
  t.mock.method(CartItem, 'findAll', async () => [
    { id: 'ci-foreign', cartId, productId: foreignProductId, quantity: 1, variantId: null },
  ]);

  // Product belongs to Store B, not Store A!
  const foreignProduct = {
    id: foreignProductId,
    storeId: STORE_B,
    name: 'Store B Foreign Item',
    price: '50.00',
    currency: 'USD',
    trackInventory: false,
    status: 'active',
    marketplaceCategory: 'Clothing',
    marketplaceVisibility: true,
  };
  t.mock.method(Product, 'findByPk', async () => foreignProduct);

  // Attempt to checkout Store B product under Store A checkout must reject
  await assert.rejects(
    checkoutService.checkout({
      buyerId: BUYER_A,
      storeId: STORE_A,
      checkoutKey: 'idemp-foreign-item-8',
      expectedTotalAmount: '55.00',
      customerInfo: { name: 'Buyer', phone: '+85512345678' },
      shippingInfo: { address: 'Address' },
    }),
    (err) => {
      assert.equal(err.statusCode, 409);
      assert.match(err.message, /Product is not available on this sales channel/);
      return true;
    }
  );
});

test('P3-MNY-001: 9. Migration 015: Empty DB and Existing DB Backfill Verification', async () => {
  // Test 9.1: Empty DB execution
  const emptyQueryInterface = {
    describeTable: async () => ({}),
    addColumn: async () => {},
    sequelize: {
      query: async () => [[]],
    },
  };

  await assert.doesNotReject(migration015.up(emptyQueryInterface, Sequelize));

  // Test 9.2: Existing DB with orders and order items without snapshots
  const mockOrderRow = {
    id: 'ord-hist-1',
    orderNumber: 'ORD-HIST-001',
    storeId: STORE_A,
    salesChannel: 'marketplace',
    subtotal: '50.00',
    shippingFee: '5.00',
    taxTotal: '0.00',
    discountTotal: '0.00',
    totalAmount: '55.00',
    currency: 'USD',
    createdAt: new Date('2026-10-01T10:00:00Z'),
  };

  const mockItemRow = {
    id: 'item-hist-1',
    orderId: 'ord-hist-1',
    productId: 'prod-hist-1',
    name: 'Historical Silver Ring',
    sku: 'RING-SLV-01',
    quantity: 1,
    price: '50.00',
    total: '50.00',
    currency: 'USD',
  };

  const updatedOrders = [];
  const updatedItems = [];

  const existingQueryInterface = {
    describeTable: async (tbl) => {
      if (tbl === 'Orders') return { orderSnapshot: true };
      if (tbl === 'OrderItems') return { lineSnapshot: true };
      return {};
    },
    addColumn: async () => {},
    sequelize: {
      query: async (sql, options) => {
        if (sql.includes('SELECT') && sql.includes('FROM Orders')) {
          return [[mockOrderRow]];
        }
        if (sql.includes('SELECT') && sql.includes('FROM OrderItems')) {
          return [[mockItemRow]];
        }
        if (sql.includes('UPDATE Orders')) {
          updatedOrders.push(options.replacements);
          return [1];
        }
        if (sql.includes('UPDATE OrderItems')) {
          updatedItems.push(options.replacements);
          return [1];
        }
        return [[]];
      },
    },
  };

  await migration015.up(existingQueryInterface, Sequelize);

  assert.equal(updatedOrders.length, 1, 'Historical order must be backfilled');
  assert.equal(updatedItems.length, 1, 'Historical item must be backfilled');

  const backfilledOrderSnapshot = JSON.parse(updatedOrders[0].snapshot);
  assert.equal(backfilledOrderSnapshot.subtotal, '50.00');
  assert.equal(backfilledOrderSnapshot.deliveryFee, '5.00');
  assert.equal(backfilledOrderSnapshot.totalAmount, '55.00');
  assert.equal(backfilledOrderSnapshot.totalAmountMinor, 5500);

  const backfilledLineSnapshot = JSON.parse(updatedItems[0].snapshot);
  assert.equal(backfilledLineSnapshot.productName, 'Historical Silver Ring');
  assert.equal(backfilledLineSnapshot.unitPrice, '50.00');
  assert.equal(backfilledLineSnapshot.total, '50.00');
});

test('P3-MNY-001: 10. Idempotent Migration Rerun: Zero duplicate updates', async () => {
  const rerunQueryInterface = {
    describeTable: async () => ({ orderSnapshot: true, lineSnapshot: true }),
    addColumn: async () => { throw new Error('addColumn should not be called'); },
    sequelize: {
      query: async (sql) => {
        if (sql.includes('WHERE orderSnapshot IS NULL')) {
          return [[]]; // zero rows left to backfill
        }
        return [[]];
      },
    },
  };

  await assert.doesNotReject(migration015.up(rerunQueryInterface, Sequelize));
});

test('P3-MNY-001: 11. Audit Command: 100% compliance across orders and items', async (t) => {
  const mockOrderRow = {
    id: 'ord-compliant-1',
    orderNumber: 'ORD-CMP-1',
    storeId: STORE_A,
    salesChannel: 'marketplace',
    subtotal: '40.00',
    shippingFee: '5.00',
    taxTotal: '0.00',
    discountTotal: '0.00',
    totalAmount: '45.00',
    currency: 'USD',
    orderSnapshot: { totalAmount: '45.00' },
  };

  const mockItemRow = {
    id: 'item-compliant-1',
    orderId: 'ord-compliant-1',
    productId: 'p-1',
    name: 'Item',
    sku: 'SKU-1',
    quantity: 1,
    price: '40.00',
    total: '40.00',
    currency: 'USD',
    lineSnapshot: { total: '40.00' },
  };

  t.mock.method(sequelize, 'query', async (sql) => {
    if (sql.includes('FROM Orders')) return [[mockOrderRow]];
    if (sql.includes('FROM OrderItems')) return [[mockItemRow]];
    return [[]];
  });

  const report = await audit();
  assert.equal(report.compliant, true, 'Audit report must be compliant');
  assert.equal(report.totalOrders, 1);
  assert.equal(report.ordersWithSnapshot, 1);
  assert.equal(report.defects.mathDefects, 0);
  assert.equal(report.defects.currencyDefects, 0);
  assert.equal(report.defects.negativeDefects, 0);
});
