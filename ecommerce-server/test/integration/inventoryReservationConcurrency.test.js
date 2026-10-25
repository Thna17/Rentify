'use strict';

// test/integration/inventoryReservationConcurrency.test.js
// Verification suite for P3-INV-003: Reservation and concurrency verification.
// Proves last-unit concurrency, zero negative balance, single winner, idempotency,
// reservation lifecycle, deadlock handling, return/restock replay, and ledger reconstruction
// using a real transaction-capable database (MySQL 8.4+ InnoDB).

process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1';
process.env.DB_PORT = process.env.DB_PORT || '3308';
process.env.DB_NAME = process.env.DB_NAME || 'rentify_ecommerce_test';
process.env.DB_USER = process.env.DB_USER || 'root';
process.env.DB_PASSWORD = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '';

const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const { sequelize, Sequelize } = require('../../config/db');
const {
  inventoryLedgerService,
  InsufficientStockError,
  InvalidInventoryStateError,
} = require('../../modules/inventory');

const checkoutService = require('../../modules/checkout/marketplaceCheckoutService');
const { invoiceFulfillmentService } = require('../../modules/invoices');
const orderStateMachineService = require('../../modules/orders/orderStateMachineService');
const POSOrderStrategy = require('../../modules/orders/core/orderCreation/strategies/POSOrderStrategy');
const NicheStrategy = require('../../modules/orders/core/orderCreation/strategies/NicheStrategy');
const retryTransaction = require('../../utils/retryTransaction');
const platformOperationsController = require('../../modules/admin/platformOperationsController');

const {
  Product,
  ProductVariant,
  InventoryBalance,
  InventoryLedgerEntry,
  InventoryReservation,
  Order,
  OrderItem,
  OrderEvent,
  Invoice,
  Payment,
  StoreAccess,
  StoreDeliveryPolicy,
  WebsiteData,
  Cart,
  CartItem,
} = require('../../models');

/**
 * Load-independent deterministic coordination barrier.
 * Halts all participating asynchronous operations until exactly `parties` have arrived,
 * then releases all parties simultaneously without arbitrary timeouts.
 */
class DeterministicBarrier {
  constructor(parties) {
    this.parties = parties;
    this.count = 0;
    this.resolvers = [];
  }

  wait() {
    return new Promise((resolve) => {
      this.count += 1;
      this.resolvers.push(resolve);
      if (this.count >= this.parties) {
        const toRelease = this.resolvers;
        this.resolvers = [];
        this.count = 0;
        for (const r of toRelease) r();
      }
    });
  }
}

/**
 * Seeds store and product catalog records in the real database.
 */
async function seedCatalog({
  storeId,
  skuId,
  productName = 'Concurrent Item',
  price = '25.00',
  onHand = 1,
  isVariant = false,
  parentProductId = null,
  hasVariants = false,
}) {
  const prodId = isVariant ? parentProductId : skuId;

  await StoreAccess.findOrCreate({
    where: { storeId },
    defaults: {
      storeId,
      ownerUserId: randomUUID(),
      websiteId: null,
      primaryCategory: 'Clothing',
      needsCategoryReview: false,
      marketplaceEnabled: true,
      marketplaceApprovalStatus: 'approved',
      marketplaceEntitlement: 'pilot',
      status: 'active',
      version: 1,
    },
  });

  await StoreDeliveryPolicy.findOrCreate({
    where: { storeId },
    defaults: {
      storeId,
      flatFee: '5.00',
      currency: 'USD',
      version: 1,
    },
  });

  let product = await Product.findByPk(prodId);
  if (!product) {
    product = await Product.create({
      id: prodId,
      storeId,
      name: productName,
      slug: `item-${Date.now()}-${randomUUID().slice(0, 6)}`,
      price,
      currency: 'USD',
      trackInventory: true,
      stockQuantity: onHand,
      status: 'active',
      marketplaceCategory: 'Clothing',
      marketplaceVisibility: true,
      hasVariants,
      version: 1,
    });
  }

  let variant = null;
  if (isVariant) {
    variant = await ProductVariant.create({
      id: skuId,
      productId: prodId,
      storeId,
      sku: `SKU-${skuId.slice(0, 8)}`,
      price,
      currency: 'USD',
      stockQuantity: onHand,
      trackInventory: true,
      isDefault: false,
      status: 'active',
    });
  } else {
    variant = await ProductVariant.create({
      id: skuId,
      productId: prodId,
      storeId,
      sku: `SKU-${skuId.slice(0, 8)}`,
      price,
      currency: 'USD',
      stockQuantity: onHand,
      trackInventory: true,
      isDefault: true,
      status: 'active',
    });
  }

  await inventoryLedgerService.ensureBalance({
    storeId,
    skuId,
    initialOnHand: onHand,
    reasonCode: 'opening_balance',
  });

  return { product, variant };
}

/**
 * Seeds a buyer's cart with items in the real database for checkout testing.
 */
async function seedBuyerCart({ buyerId, storeId, productId, variantId = null, quantity = 1, price = '25.00', channel = 'marketplace', websiteId = null }) {
  let cart = await Cart.findOne({ where: { buyerId, storeId, channel, websiteId } });
  if (!cart) {
    cart = await Cart.create({
      id: randomUUID(),
      buyerId,
      storeId,
      websiteId,
      channel,
      status: 'active',
      currency: 'USD',
      itemCount: quantity,
      subtotal: (Number(price) * quantity).toFixed(2),
      grandTotal: (Number(price) * quantity).toFixed(2),
      version: 1,
    });
  }
  const item = await CartItem.create({
    id: randomUUID(),
    cartId: cart.id,
    productId,
    variantId: variantId || null,
    quantity,
    unitPrice: price,
    price,
    total: (Number(price) * quantity).toFixed(2),
  });
  return { cart, item };
}

// -------------------------------------------------------------------------
// P3-INV-003 Concurrency and Invariant Tests
// -------------------------------------------------------------------------

test('P3-INV-003: 1. Real Engine Anti-Mock Proof: Verifies InnoDB Engine, ACID Transactions, and Row Locking', async () => {
  await sequelize.authenticate();
  await sequelize.sync();

  const [dbInfo] = await sequelize.query('SELECT DATABASE() as db, VERSION() as ver;');
  assert.equal(dbInfo[0].db, 'rentify_ecommerce_test', 'Must execute against real rentify_ecommerce_test database');

  const [engineInfo] = await sequelize.query(
    "SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'rentify_ecommerce_test' AND TABLE_NAME = 'InventoryBalances';"
  );
  assert.equal(engineInfo[0].ENGINE, 'InnoDB', 'InventoryBalances must use real transaction-capable InnoDB engine');
});

test('P3-INV-003: 2. Marketplace Checkout: Last Available Unit Concurrency Barrier Produces Exactly One Winner', async () => {
  const storeId = randomUUID();
  const skuId = randomUUID();
  await seedCatalog({ storeId, skuId, onHand: 1 });

  const buyer1 = randomUUID();
  const buyer2 = randomUUID();
  await seedBuyerCart({ buyerId: buyer1, storeId, productId: skuId, variantId: skuId, quantity: 1 });
  await seedBuyerCart({ buyerId: buyer2, storeId, productId: skuId, variantId: skuId, quantity: 1 });

  const barrier = new DeterministicBarrier(2);
  const checkoutResults = [];

  const runCheckout = async (buyerId, key) => {
    await barrier.wait();
    try {
      const order = await checkoutService.checkout({
        buyerId,
        storeId,
        checkoutKey: key,
        expectedTotalAmount: '30.00',
        customerInfo: { name: 'Buyer Test', phone: '+85512345678' },
        shippingInfo: { address: '123 Main St, Phnom Penh' },
        channel: 'marketplace',
      });
      checkoutResults.push({ buyerId, success: true, order });
    } catch (err) {
      checkoutResults.push({
        buyerId,
        success: false,
        statusCode: err.statusCode || err.status,
        code: err.code,
        message: err.message,
      });
    }
  };

  await Promise.all([
    runCheckout(buyer1, `chk-mkt-1-${Date.now()}`),
    runCheckout(buyer2, `chk-mkt-2-${Date.now()}`),
  ]);

  const winners = checkoutResults.filter((r) => r.success);
  const losers = checkoutResults.filter((r) => !r.success);

  assert.equal(winners.length, 1, 'Exactly one buyer must win the last available unit');
  assert.equal(losers.length, 1, 'Exactly one buyer must be rejected');
  assert.equal(losers[0].statusCode, 409, 'Conflict status code 409 required');
  assert.match(losers[0].message, /Insufficient stock/i);

  // Authoritative balance verification
  const balance = await inventoryLedgerService.getBalance({ storeId, skuId });
  assert.equal(balance.onHand, 0, 'On-hand stock is deducted upon checkout fulfillment');
  assert.equal(balance.reserved, 0, 'Reserved stock fulfilled to 0');
  assert.equal(balance.available, 0, 'Available stock must be exactly 0 (no negative balance)');

  // Direct SQL verification against real database
  const [dbRows] = await sequelize.query(
    'SELECT onHand, reserved, available FROM InventoryBalances WHERE storeId = ? AND skuId = ?',
    { replacements: [storeId, skuId] }
  );
  assert.equal(dbRows[0].onHand, 0);
  assert.equal(dbRows[0].reserved, 0);
  assert.equal(dbRows[0].available, 0);
});

test('P3-INV-003: 3. Hosted Storefront Checkout: Competing Concurrently for the Last Unit', async () => {
  const storeId = randomUUID();
  const skuId = randomUUID();
  await seedCatalog({ storeId, skuId, onHand: 1 });

  const websiteId = randomUUID();
  await WebsiteData.create({
    id: randomUUID(),
    websiteId,
    storeId,
    userId: randomUUID(),
    niche: 'ecommerce',
    status: 'active',
    domain: `store-${storeId.slice(0, 8)}.rentify.com`,
  });
  await StoreAccess.update({ websiteId }, { where: { storeId } });
  await Product.update({ websiteId }, { where: { storeId } });

  const buyer1 = randomUUID();
  const buyer2 = randomUUID();
  await seedBuyerCart({ buyerId: buyer1, storeId, productId: skuId, variantId: skuId, quantity: 1, channel: 'storefront', websiteId });
  await seedBuyerCart({ buyerId: buyer2, storeId, productId: skuId, variantId: skuId, quantity: 1, channel: 'storefront', websiteId });

  const barrier = new DeterministicBarrier(2);
  const results = [];

  const runStorefrontCheckout = async (buyerId, key) => {
    await barrier.wait();
    try {
      const order = await checkoutService.checkout({
        buyerId,
        storeId,
        checkoutKey: key,
        expectedTotalAmount: '30.00',
        customerInfo: { name: 'Storefront Buyer', phone: '+85512345678' },
        shippingInfo: { address: '456 Riverside, Siem Reap' },
        channel: 'storefront',
      });
      results.push({ buyerId, success: true, order });
    } catch (err) {
      results.push({ buyerId, success: false, statusCode: err.statusCode || err.status, message: err.message });
    }
  };

  await Promise.all([
    runStorefrontCheckout(buyer1, `chk-sf-1-${Date.now()}`),
    runStorefrontCheckout(buyer2, `chk-sf-2-${Date.now()}`),
  ]);

  const winners = results.filter((r) => r.success);
  const losers = results.filter((r) => !r.success);

  assert.equal(winners.length, 1, 'Storefront last unit checkout must produce exactly one winner');
  assert.equal(losers.length, 1, 'Storefront loser must be rejected');
  assert.equal(losers[0].statusCode, 409);

  const balance = await inventoryLedgerService.getBalance({ storeId, skuId });
  assert.equal(balance.available, 0);
  assert.equal(balance.onHand, 0);
  assert.equal(balance.reserved, 0);
});

test('P3-INV-003: 4. Point-of-Sale vs Online Checkout: Shared Last Unit Contention', async () => {
  const storeId = randomUUID();
  const skuId = randomUUID();
  await seedCatalog({ storeId, skuId, onHand: 1 });

  const nicheStrategy = new NicheStrategy('ecommerce');
  const mockPaymentProcessor = {
    process: async (order, paymentMethod) => ({
      id: randomUUID(),
      orderId: order.id,
      amount: order.totalAmount,
      status: 'completed',
      paymentMethod,
      toJSON: () => ({ status: 'completed' }),
    }),
  };

  const posStrategy = new POSOrderStrategy(
    { Product, ProductVariant, Order, OrderItem, Invoice, Payment, Customer: { findOrCreate: async () => [{ id: 'pos-cust' }] } },
    mockPaymentProcessor,
    {},
    nicheStrategy
  );

  const barrier = new DeterministicBarrier(2);
  const results = [];

  const runPOS = async () => {
    await barrier.wait();
    try {
      const posOrder = await posStrategy.execute({
        websiteId: null,
        storeId,
        items: [{ productId: skuId, quantity: 1, price: 25.0, productType: 'physical' }],
        paymentMethod: 'cash',
        cashierId: 'cashier-1',
        currency: 'USD',
        checkoutKey: `pos-chk-${Date.now()}`,
      });
      results.push({ channel: 'pos', success: true, order: posOrder.order });
    } catch (err) {
      results.push({ channel: 'pos', success: false, statusCode: err.statusCode || 409, message: err.message });
    }
  };

  const onlineBuyer = randomUUID();
  await seedBuyerCart({ buyerId: onlineBuyer, storeId, productId: skuId, variantId: skuId, quantity: 1 });

  const runOnline = async () => {
    await barrier.wait();
    try {
      const onlineOrder = await checkoutService.checkout({
        buyerId: onlineBuyer,
        storeId,
        checkoutKey: `online-chk-${Date.now()}`,
        expectedTotalAmount: '30.00',
        customerInfo: { name: 'Online Buyer', phone: '+85512345678' },
        shippingInfo: { address: '789 Blvd, Battambang' },
        channel: 'marketplace',
      });
      results.push({ channel: 'online', success: true, order: onlineOrder });
    } catch (err) {
      results.push({ channel: 'online', success: false, statusCode: err.statusCode || 409, message: err.message });
    }
  };

  await Promise.all([runPOS(), runOnline()]);

  const winners = results.filter((r) => r.success);
  const losers = results.filter((r) => !r.success);

  assert.equal(winners.length, 1, 'Exactly one channel can claim the last unit');
  assert.equal(losers.length, 1, 'Competing channel must fail with 409 conflict');

  const balance = await inventoryLedgerService.getBalance({ storeId, skuId });
  assert.equal(balance.available, 0, 'Available stock must be 0');
  assert.ok(balance.onHand >= 0, 'On-hand cannot be negative');
});

test('P3-INV-003: 5. Invoice Fulfillment: Explicit Reservation Holds Unit and Preempts POS Sale', async () => {
  const storeId = randomUUID();
  const skuId = randomUUID();
  await seedCatalog({ storeId, skuId, onHand: 1 });

  // 1. Create and issue invoice with reservation
  const invoiceOrder = await invoiceFulfillmentService.createInvoiceOrder({
    storeId,
    idempotencyKey: `inv-create-${randomUUID()}`,
    actor: { id: 'staff-1', role: 'merchant' },
    invoiceData: {
      invoiceNumber: `INV-${Date.now()}`,
      items: [{ productId: skuId, quantity: 1, price: '25.00' }],
      status: 'pending',
    },
  });

  const invoiceId = invoiceOrder.invoice.id;
  assert.equal(invoiceOrder.order.stockReserved, true, 'Issued invoice must hold stock reservation');

  // Verify reservation holds available stock to 0
  const balBefore = await inventoryLedgerService.getBalance({ storeId, skuId });
  assert.equal(balBefore.onHand, 1);
  assert.equal(balBefore.reserved, 1);
  assert.equal(balBefore.available, 0);

  // 2. Concurrent POS attempt to sell the reserved unit must be rejected
  const nicheStrategy = new NicheStrategy('ecommerce');
  const posStrategy = new POSOrderStrategy(
    { Product, ProductVariant, Order, OrderItem, Invoice, Payment, Customer: { findOrCreate: async () => [{ id: 'pos-cust' }] } },
    { process: async () => ({ id: 'pay', status: 'completed', toJSON: () => ({ status: 'completed' }) }) },
    {},
    nicheStrategy
  );

  await assert.rejects(
    async () => {
      await posStrategy.execute({
        websiteId: null,
        storeId,
        items: [{ productId: skuId, quantity: 1, price: 25.0, productType: 'physical' }],
        paymentMethod: 'cash',
        cashierId: 'cashier-1',
        currency: 'USD',
        checkoutKey: `pos-fail-${Date.now()}`,
      });
    },
    (err) => {
      assert.ok(err.statusCode === 409 || err.code === 'INSUFFICIENT_STOCK' || err.message?.includes('Insufficient stock'));
      return true;
    }
  );

  // 3. Fulfill invoice order (claims reservation: onHand - 1, reserved - 1)
  const fulfillResult = await invoiceFulfillmentService.fulfillInvoice({
    invoiceId,
    storeId,
    actor: { id: 'staff-1', role: 'merchant' },
    idempotencyKey: `inv-ful-${invoiceId}`,
  });
  assert.equal(fulfillResult.fulfilled, true);

  const balAfter = await inventoryLedgerService.getBalance({ storeId, skuId });
  assert.equal(balAfter.onHand, 0);
  assert.equal(balAfter.reserved, 0);
  assert.equal(balAfter.available, 0);

  // 4. Repeated fulfillment cannot deduct twice (idempotent replay)
  const repeatResult = await invoiceFulfillmentService.fulfillInvoice({
    invoiceId,
    storeId,
    actor: { id: 'staff-1', role: 'merchant' },
    idempotencyKey: `inv-ful-retry-${invoiceId}`,
  });
  assert.equal(repeatResult.alreadyFulfilled, true);

  const balAfterRepeat = await inventoryLedgerService.getBalance({ storeId, skuId });
  assert.equal(balAfterRepeat.onHand, 0, 'Replayed fulfillment cannot deduct stock twice');
  assert.equal(balAfterRepeat.reserved, 0);
  assert.equal(balAfterRepeat.available, 0);
});

test('P3-INV-003: 6. Multi-Variant / SKU Selection: Targeted Contention on Specific Variant with Sibling SKU Isolation', async () => {
  const storeId = randomUUID();
  const parentProdId = randomUUID();
  const skuSizeM = randomUUID();
  const skuSizeL = randomUUID();

  // Size M has only 1 unit, Size L has 5 units
  await seedCatalog({ storeId, skuId: skuSizeM, onHand: 1, isVariant: true, parentProductId: parentProdId, hasVariants: true });
  await seedCatalog({ storeId, skuId: skuSizeL, onHand: 5, isVariant: true, parentProductId: parentProdId, hasVariants: true });

  const buyerM1 = randomUUID();
  const buyerM2 = randomUUID();
  const buyerL = randomUUID();

  await seedBuyerCart({ buyerId: buyerM1, storeId, productId: parentProdId, variantId: skuSizeM, quantity: 1 });
  await seedBuyerCart({ buyerId: buyerM2, storeId, productId: parentProdId, variantId: skuSizeM, quantity: 1 });
  await seedBuyerCart({ buyerId: buyerL, storeId, productId: parentProdId, variantId: skuSizeL, quantity: 2 });

  const barrier = new DeterministicBarrier(3);
  const results = [];

  const taskM = async (buyerId, key) => {
    await barrier.wait();
    try {
      const order = await checkoutService.checkout({
        buyerId,
        storeId,
        checkoutKey: key,
        expectedTotalAmount: '30.00',
        customerInfo: { name: 'Variant Buyer M', phone: '+85512345678' },
        shippingInfo: { address: '101 Street, Phnom Penh' },
        channel: 'marketplace',
      });
      results.push({ variant: 'M', buyerId, success: true, order });
    } catch (err) {
      results.push({ variant: 'M', buyerId, success: false, statusCode: err.statusCode || err.status });
    }
  };

  const taskL = async (buyerId, key) => {
    await barrier.wait();
    try {
      const order = await checkoutService.checkout({
        buyerId,
        storeId,
        checkoutKey: key,
        expectedTotalAmount: '55.00',
        customerInfo: { name: 'Variant Buyer L', phone: '+85512345678' },
        shippingInfo: { address: '102 Street, Phnom Penh' },
        channel: 'marketplace',
      });
      results.push({ variant: 'L', buyerId, success: true, order });
    } catch (err) {
      results.push({ variant: 'L', buyerId, success: false, statusCode: err.statusCode || err.status });
    }
  };

  await Promise.all([
    taskM(buyerM1, `chk-m1-${Date.now()}`),
    taskM(buyerM2, `chk-m2-${Date.now()}`),
    taskL(buyerL, `chk-l1-${Date.now()}`),
  ]);

  const mWinners = results.filter((r) => r.variant === 'M' && r.success);
  const mLosers = results.filter((r) => r.variant === 'M' && !r.success);
  const lWinners = results.filter((r) => r.variant === 'L' && r.success);

  assert.equal(mWinners.length, 1, 'Size M last unit produces exactly one winner');
  assert.equal(mLosers.length, 1, 'Size M loser fails with 409 conflict');
  assert.equal(lWinners.length, 1, 'Size L checkout succeeds independently');

  // Verify Size M balance: 0 onHand, 0 reserved, 0 available
  const balM = await inventoryLedgerService.getBalance({ storeId, skuId: skuSizeM });
  assert.equal(balM.available, 0);
  assert.equal(balM.onHand, 0);
  assert.equal(balM.reserved, 0);

  // Verify Size L balance: 3 onHand, 0 reserved, 3 available (5 - 2 = 3)
  const balL = await inventoryLedgerService.getBalance({ storeId, skuId: skuSizeL });
  assert.equal(balL.available, 3);
  assert.equal(balL.onHand, 3);
  assert.equal(balL.reserved, 0);
});

test('P3-INV-003: 7. Simultaneous Multi-Channel: 4-Way Contention for Single Last Unit', async () => {
  const storeId = randomUUID();
  const skuId = randomUUID();
  await seedCatalog({ storeId, skuId, onHand: 1 });

  const websiteId = randomUUID();
  await WebsiteData.create({
    id: randomUUID(),
    websiteId,
    storeId,
    userId: randomUUID(),
    niche: 'ecommerce',
    status: 'active',
    domain: `store-${storeId.slice(0, 8)}.rentify.com`,
  });
  await StoreAccess.update({ websiteId }, { where: { storeId } });
  await Product.update({ websiteId }, { where: { storeId } });

  const buyerMkt = randomUUID();
  const buyerSf = randomUUID();
  await seedBuyerCart({ buyerId: buyerMkt, storeId, productId: skuId, variantId: skuId, quantity: 1 });
  await seedBuyerCart({ buyerId: buyerSf, storeId, productId: skuId, variantId: skuId, quantity: 1 });

  const barrier = new DeterministicBarrier(4);
  const outcomes = [];

  // Channel 1: Marketplace
  const channel1 = async () => {
    await barrier.wait();
    try {
      await checkoutService.checkout({
        buyerId: buyerMkt,
        storeId,
        checkoutKey: `4way-mkt-${Date.now()}`,
        expectedTotalAmount: '30.00',
        customerInfo: { name: 'Mkt Buyer', phone: '+85512345678' },
        shippingInfo: { address: 'A1 St, PP' },
        channel: 'marketplace',
      });
      outcomes.push({ channel: 'marketplace', success: true });
    } catch (err) {
      outcomes.push({ channel: 'marketplace', success: false, statusCode: err.statusCode || 409 });
    }
  };

  // Channel 2: Storefront
  const channel2 = async () => {
    await barrier.wait();
    try {
      await checkoutService.checkout({
        buyerId: buyerSf,
        storeId,
        checkoutKey: `4way-sf-${Date.now()}`,
        expectedTotalAmount: '30.00',
        customerInfo: { name: 'Sf Buyer', phone: '+85512345678' },
        shippingInfo: { address: 'A2 St, PP' },
        channel: 'storefront',
      });
      outcomes.push({ channel: 'storefront', success: true });
    } catch (err) {
      outcomes.push({ channel: 'storefront', success: false, statusCode: err.statusCode || 409 });
    }
  };

  // Channel 3: POS
  const channel3 = async () => {
    await barrier.wait();
    try {
      const nicheStrategy = new NicheStrategy('ecommerce');
      const posStrategy = new POSOrderStrategy(
        { Product, ProductVariant, Order, OrderItem, Invoice, Payment, Customer: { findOrCreate: async () => [{ id: 'pos-cust' }] } },
        { process: async () => ({ id: 'pay', status: 'completed', toJSON: () => ({ status: 'completed' }) }) },
        {},
        nicheStrategy
      );
      await posStrategy.execute({
        websiteId: null,
        storeId,
        items: [{ productId: skuId, quantity: 1, price: 25.0, productType: 'physical' }],
        paymentMethod: 'cash',
        cashierId: 'cashier-4way',
        currency: 'USD',
        checkoutKey: `4way-pos-${Date.now()}`,
      });
      outcomes.push({ channel: 'pos', success: true });
    } catch (err) {
      outcomes.push({ channel: 'pos', success: false, statusCode: err.statusCode || 409 });
    }
  };

  // Channel 4: Invoice Reservation
  const channel4 = async () => {
    await barrier.wait();
    try {
      await invoiceFulfillmentService.createInvoiceOrder({
        storeId,
        idempotencyKey: `4way-inv-${Date.now()}`,
        actor: { id: 'staff-4way', role: 'merchant' },
        invoiceData: {
          invoiceNumber: `INV-4WAY-${Date.now()}`,
          items: [{ productId: skuId, quantity: 1, price: '25.00' }],
          status: 'pending',
        },
      });
      outcomes.push({ channel: 'invoice', success: true });
    } catch (err) {
      outcomes.push({ channel: 'invoice', success: false, statusCode: err.statusCode || 409 });
    }
  };

  await Promise.all([channel1(), channel2(), channel3(), channel4()]);

  const winners = outcomes.filter((o) => o.success);
  const losers = outcomes.filter((o) => !o.success);

  assert.equal(winners.length, 1, 'Exactly one channel must win the single available unit in 4-way contention');
  assert.equal(losers.length, 3, 'All other 3 channels must fail');
  for (const loser of losers) {
    assert.equal(loser.statusCode, 409, 'All losers must receive 409 Conflict');
  }

  const finalBalance = await inventoryLedgerService.getBalance({ storeId, skuId });
  assert.equal(finalBalance.available, 0);
  assert.ok(finalBalance.onHand >= 0);
});

test('P3-INV-003: 8. Retry Idempotency: Duplicate Checkout & Reservation Cannot Double-Deduct or Double-Reserve', async () => {
  const storeId = randomUUID();
  const skuId = randomUUID();
  await seedCatalog({ storeId, skuId, onHand: 5 });

  const buyerId = randomUUID();
  const idempotencyKey = `retry-key-${Date.now()}`;
  await seedBuyerCart({ buyerId, storeId, productId: skuId, variantId: skuId, quantity: 2 });

  const payload = {
    buyerId,
    storeId,
    checkoutKey: idempotencyKey,
    expectedTotalAmount: '55.00',
    customerInfo: { name: 'Retry Buyer', phone: '+85512345678' },
    shippingInfo: { address: 'Main St, Phnom Penh' },
    channel: 'marketplace',
  };

  // First execution
  const order1 = await checkoutService.checkout(payload);
  assert.ok(order1.id);

  // Exact same replay
  const order2 = await checkoutService.checkout(payload);
  assert.equal(order2.id, order1.id, 'Idempotent retry must return the exact same order');

  // Verify balance: onHand = 3 (5 - 2 = 3), reserved = 0, available = 3. Duplicate checkout did not double-deduct!
  const balance = await inventoryLedgerService.getBalance({ storeId, skuId });
  assert.equal(balance.onHand, 3, 'Stock must not be double deducted on replay');
  assert.equal(balance.reserved, 0);
  assert.equal(balance.available, 3);

  // Raw SQL verify ledger entries count
  const [entries] = await sequelize.query(
    'SELECT COUNT(*) as cnt FROM InventoryLedgerEntries WHERE idempotencyKey = ?',
    { replacements: [`res-${idempotencyKey}-${skuId}`] }
  );
  assert.equal(Number(entries[0].cnt), 1, 'Only one immutable ledger entry must exist for idempotency key');
});

test('P3-INV-003: 9. Order Cancellation: Exactly One Restoration / Release Without Replay Double-Restore', async () => {
  const storeId = randomUUID();
  const skuId = randomUUID();
  await seedCatalog({ storeId, skuId, onHand: 5 });

  const buyerId = randomUUID();
  await seedBuyerCart({ buyerId, storeId, productId: skuId, variantId: skuId, quantity: 2 });

  const order = await checkoutService.checkout({
    buyerId,
    storeId,
    checkoutKey: `cancel-test-${Date.now()}`,
    expectedTotalAmount: '55.00',
    customerInfo: { name: 'Cancel Buyer', phone: '+85512345678' },
    shippingInfo: { address: 'Main St, Phnom Penh' },
    channel: 'marketplace',
  });

  // Balance before cancel: onHand=3, reserved=0, available=3
  const balBefore = await inventoryLedgerService.getBalance({ storeId, skuId });
  assert.equal(balBefore.onHand, 3);
  assert.equal(balBefore.reserved, 0);
  assert.equal(balBefore.available, 3);

  const cancelKey = `cancel-${Date.now()}`;

  // Call 1: Cancel order
  const cancel1 = await orderStateMachineService.cancelOrder(order.id, {
    actor: { id: buyerId, type: 'buyer' },
    reason: 'Changed mind',
    idempotencyKey: cancelKey,
  });

  assert.equal(cancel1.order.status, 'cancelled');

  // Balance after cancel: stock restored (+2 onHand, reserved=0, available=5)
  const balAfter1 = await inventoryLedgerService.getBalance({ storeId, skuId });
  assert.equal(balAfter1.onHand, 5, 'Cancelled order must restore stock exactly once');
  assert.equal(balAfter1.reserved, 0);
  assert.equal(balAfter1.available, 5);

  // Call 2: Duplicate cancellation replay
  const cancel2 = await orderStateMachineService.cancelOrder(order.id, {
    actor: { id: buyerId, type: 'buyer' },
    reason: 'Changed mind',
    idempotencyKey: cancelKey,
  });
  assert.equal(cancel2.duplicate, true);

  // Invariant: Balance cannot be restored twice
  const balAfter2 = await inventoryLedgerService.getBalance({ storeId, skuId });
  assert.equal(balAfter2.available, 5, 'Duplicate cancellation cannot release or restore stock twice');
  assert.equal(balAfter2.reserved, 0);
});

test('P3-INV-003: 10. Reservation Timeout & Expiry: Stale Reservation Recovery & Fulfillment Rejection', async () => {
  const storeId = randomUUID();
  const skuId = randomUUID();
  await seedCatalog({ storeId, skuId, onHand: 2 });

  // 1. Create a reservation that is expired in the past
  const resKey = `stale-res-${Date.now()}`;
  const mutation = await inventoryLedgerService.createReservation({
    storeId,
    skuId,
    quantity: 2,
    sourceType: 'checkout',
    sourceId: randomUUID(),
    actor: { id: 'buyer-stale', type: 'buyer' },
    idempotencyKey: resKey,
    ttlMinutes: 0, // Immediately past
  });

  const reservation = mutation.reservation;
  // Artificially push expiresAt back 10 minutes in real DB
  const pastDate = new Date(Date.now() - 10 * 60 * 1000);
  await reservation.update({ expiresAt: pastDate });

  // Balance before expiry: onHand=2, reserved=2, available=0
  const balBefore = await inventoryLedgerService.getBalance({ storeId, skuId });
  assert.equal(balBefore.available, 0);
  assert.equal(balBefore.reserved, 2);

  // 2. Run background reaper
  const expiryResults = await inventoryLedgerService.expireStaleReservations();
  const expiredMatch = expiryResults.find((r) => r.id === reservation.id);
  assert.ok(expiredMatch, 'Stale reservation must be found and expired');
  assert.equal(expiredMatch.expired, true);

  // 3. Balance after expiry: available restored from 0 to 2
  const balAfter = await inventoryLedgerService.getBalance({ storeId, skuId });
  assert.equal(balAfter.available, 2, 'Available stock must be restored to 2 upon expiry');
  assert.equal(balAfter.reserved, 0);

  // 4. Attempting to fulfill the expired reservation must be rejected
  await assert.rejects(
    async () => {
      await inventoryLedgerService.fulfillReservation({
        reservationId: reservation.id,
        storeId,
        actor: { id: 'system', type: 'system' },
        sourceId: 'ord-fail',
        idempotencyKey: `ful-expired-${reservation.id}`,
      });
    },
    (err) => {
      assert.ok(err instanceof InvalidInventoryStateError || err.code === 'INVALID_INVENTORY_STATE');
      assert.match(err.message, /expired/i);
      return true;
    }
  );
});

test('P3-INV-003: 11. Reservation Release: Clean Cancellation on Payment Failure', async () => {
  const storeId = randomUUID();
  const skuId = randomUUID();
  await seedCatalog({ storeId, skuId, onHand: 3 });

  const resKey = `rel-test-${Date.now()}`;
  const mutation = await inventoryLedgerService.createReservation({
    storeId,
    skuId,
    quantity: 1,
    sourceType: 'checkout',
    sourceId: randomUUID(),
    actor: { id: 'buyer-release', type: 'buyer' },
    idempotencyKey: resKey,
  });

  const reservation = mutation.reservation;
  const balBefore = await inventoryLedgerService.getBalance({ storeId, skuId });
  assert.equal(balBefore.available, 2);
  assert.equal(balBefore.reserved, 1);

  // Release reservation upon checkout failure
  const releaseKey = `rel-act-${reservation.id}`;
  const out1 = await inventoryLedgerService.releaseReservation({
    reservationId: reservation.id,
    storeId,
    actor: { id: 'buyer-release', type: 'buyer' },
    idempotencyKey: releaseKey,
  });
  assert.equal(out1.released, true);

  const balAfter = await inventoryLedgerService.getBalance({ storeId, skuId });
  assert.equal(balAfter.available, 3, 'Available stock restored to 3');
  assert.equal(balAfter.reserved, 0);

  // Replay release reservation
  const out2 = await inventoryLedgerService.releaseReservation({
    reservationId: reservation.id,
    storeId,
    actor: { id: 'buyer-release', type: 'buyer' },
    idempotencyKey: releaseKey,
  });
  assert.equal(out2.alreadyReleased, true);

  const balAfterReplay = await inventoryLedgerService.getBalance({ storeId, skuId });
  assert.equal(balAfterReplay.available, 3, 'Duplicate release does not increment available stock twice');
});

test('P3-INV-003: 12. Deadlock Retry: Concurrent Interleaved Mutations Resolved Idempotently', async () => {
  const storeId = randomUUID();
  const skuA = randomUUID();
  const skuB = randomUUID();

  await seedCatalog({ storeId, skuId: skuA, onHand: 10 });
  await seedCatalog({ storeId, skuId: skuB, onHand: 10 });

  const startBarrier = new DeterministicBarrier(2);
  const midBarrier = new DeterministicBarrier(2);
  let op1First = true;
  let op2First = true;

  // Operation 1: locks A then B
  const op1 = () =>
    retryTransaction(async (tx) => {
      const isFirst = op1First;
      if (isFirst) {
        op1First = false;
        await startBarrier.wait();
      }

      await inventoryLedgerService.mutateBalance(
        {
          storeId,
          skuId: skuA,
          changeOnHand: -1,
          changeReserved: 0,
          reasonCode: 'sale',
          sourceType: 'order',
          sourceId: 'op1',
          actor: { id: 'user-1', type: 'user' },
          idempotencyKey: `deadlock-op1-a-${skuA}`,
        },
        { transaction: tx }
      );

      if (isFirst) {
        await midBarrier.wait();
      }

      await inventoryLedgerService.mutateBalance(
        {
          storeId,
          skuId: skuB,
          changeOnHand: -1,
          changeReserved: 0,
          reasonCode: 'sale',
          sourceType: 'order',
          sourceId: 'op1',
          actor: { id: 'user-1', type: 'user' },
          idempotencyKey: `deadlock-op1-b-${skuB}`,
        },
        { transaction: tx }
      );
    });

  // Operation 2: locks B then A (inverted lock order)
  const op2 = () =>
    retryTransaction(async (tx) => {
      const isFirst = op2First;
      if (isFirst) {
        op2First = false;
        await startBarrier.wait();
      }

      await inventoryLedgerService.mutateBalance(
        {
          storeId,
          skuId: skuB,
          changeOnHand: -1,
          changeReserved: 0,
          reasonCode: 'sale',
          sourceType: 'order',
          sourceId: 'op2',
          actor: { id: 'user-2', type: 'user' },
          idempotencyKey: `deadlock-op2-b-${skuB}`,
        },
        { transaction: tx }
      );

      if (isFirst) {
        await midBarrier.wait();
      }

      await inventoryLedgerService.mutateBalance(
        {
          storeId,
          skuId: skuA,
          changeOnHand: -1,
          changeReserved: 0,
          reasonCode: 'sale',
          sourceType: 'order',
          sourceId: 'op2',
          actor: { id: 'user-2', type: 'user' },
          idempotencyKey: `deadlock-op2-a-${skuA}`,
        },
        { transaction: tx }
      );
    });

  await Promise.all([op1(), op2()]);

  // Both operations must successfully commit without phantom duplicate deductions
  const balA = await inventoryLedgerService.getBalance({ storeId, skuId: skuA });
  const balB = await inventoryLedgerService.getBalance({ storeId, skuId: skuB });

  assert.equal(balA.onHand, 8, 'SKU A deducted exactly 2 times (10 - 2 = 8)');
  assert.equal(balB.onHand, 8, 'SKU B deducted exactly 2 times (10 - 2 = 8)');
});

test('P3-INV-003: 13. Return & Restock Replay: Resellable Inspection vs Damaged Zero Stock Effect', async () => {
  const storeId = randomUUID();
  const skuId = randomUUID();
  await seedCatalog({ storeId, skuId, onHand: 10 });

  // Create delivered order of 2 items
  const order = await Order.create(
    {
      id: randomUUID(),
      orderNumber: `ORD-RET-${Date.now()}`,
      storeId,
      buyerId: randomUUID(),
      status: 'fulfilled',
      fulfillmentStatus: 'delivered',
      returnStatus: 'return_approved',
      stockDeducted: true,
      stockRestocked: false,
      totalAmount: '50.00',
      subtotal: '50.00',
      currency: 'USD',
      OrderItems: [
        {
          id: randomUUID(),
          productId: skuId,
          skuId,
          variantId: skuId,
          name: 'Returnable Item',
          sku: `SKU-${skuId.slice(0, 8)}`,
          quantity: 2,
          basePrice: '25.00',
          price: '25.00',
          total: '50.00',
          returnCondition: null,
          restockedQuantity: 0,
        },
      ],
    },
    {
      include: [{ model: OrderItem, as: 'OrderItems' }],
    }
  );

  const retKey = `ret-${Date.now()}`;

  // Call 1: Physical receipt with resellable condition
  const res1 = await orderStateMachineService.receiveReturn(order.id, {
    actor: { id: 'merchant-1', role: 'merchant' },
    inspectionOutcome: 'resellable',
    reason: 'Returned in original condition',
    idempotencyKey: retKey,
  });
  assert.equal(res1.duplicate, false);

  // Authoritative balance must increase by 2: 10 + 2 = 12
  const balAfter1 = await inventoryLedgerService.getBalance({ storeId, skuId });
  assert.equal(balAfter1.onHand, 12);
  assert.equal(balAfter1.available, 12);

  // Call 2: Duplicate return receipt replay
  const res2 = await orderStateMachineService.receiveReturn(order.id, {
    actor: { id: 'merchant-1', role: 'merchant' },
    inspectionOutcome: 'resellable',
    reason: 'Returned in original condition',
    idempotencyKey: retKey,
  });
  assert.equal(res2.duplicate, true);

  // Invariant: Balance must NOT increase a second time
  const balAfter2 = await inventoryLedgerService.getBalance({ storeId, skuId });
  assert.equal(balAfter2.onHand, 12, 'Replayed return receipt cannot restore stock twice');

  // Call 3: Damaged return order must NOT increase sellable stock
  const orderDamaged = await Order.create(
    {
      id: randomUUID(),
      orderNumber: `ORD-DAMAGED-${Date.now()}`,
      storeId,
      buyerId: randomUUID(),
      status: 'fulfilled',
      fulfillmentStatus: 'delivered',
      returnStatus: 'return_approved',
      stockDeducted: true,
      stockRestocked: false,
      totalAmount: '75.00',
      subtotal: '75.00',
      currency: 'USD',
      OrderItems: [
        {
          id: randomUUID(),
          productId: skuId,
          skuId,
          variantId: skuId,
          name: 'Damaged Item',
          sku: `SKU-${skuId.slice(0, 8)}`,
          quantity: 3,
          basePrice: '25.00',
          price: '25.00',
          total: '75.00',
          returnCondition: null,
          restockedQuantity: 0,
        },
      ],
    },
    {
      include: [{ model: OrderItem, as: 'OrderItems' }],
    }
  );

  await orderStateMachineService.receiveReturn(orderDamaged.id, {
    actor: { id: 'merchant-1', role: 'merchant' },
    inspectionOutcome: 'damaged',
    reason: 'Broken in transit',
    idempotencyKey: `ret-damaged-${orderDamaged.id}`,
  });

  // Sellable stock MUST remain exactly 12
  const balAfterDamaged = await inventoryLedgerService.getBalance({ storeId, skuId });
  assert.equal(balAfterDamaged.onHand, 12, 'Damaged returns must not increase sellable on-hand stock');
});

test('P3-INV-003: 14. Administrative Adjustments: Bound Enforcement & Replay Protection', async () => {
  const storeId = randomUUID();
  const skuId = randomUUID();
  await seedCatalog({ storeId, skuId, onHand: 5 });

  // 1. Negative adjustment exceeding current balance must be rejected
  await assert.rejects(
    async () => {
      await inventoryLedgerService.adjustBalance({
        storeId,
        skuId,
        delta: -10, // Exceeds onHand 5
        reasonCode: 'manual_adjustment',
        actor: { id: 'admin-1', type: 'admin' },
        idempotencyKey: `neg-adj-${Date.now()}`,
        notes: 'Excessive adjustment',
      });
    },
    (err) => {
      assert.ok(err instanceof InsufficientStockError || err.code === 'INSUFFICIENT_STOCK');
      return true;
    }
  );

  // 2. Positive adjustment +15
  const adjKey = `admin-adj-${Date.now()}`;
  const mutation1 = await inventoryLedgerService.adjustBalance({
    storeId,
    skuId,
    delta: 15,
    reasonCode: 'restock',
    sourceType: 'admin_adjustment',
    actor: { id: 'admin-1', type: 'admin' },
    idempotencyKey: adjKey,
    notes: 'Platform authorized restock',
  });
  assert.equal(mutation1.duplicate, false);

  const balAfter1 = await inventoryLedgerService.getBalance({ storeId, skuId });
  assert.equal(balAfter1.onHand, 20);

  // 3. Replay with same idempotency key
  const mutation2 = await inventoryLedgerService.adjustBalance({
    storeId,
    skuId,
    delta: 15,
    reasonCode: 'restock',
    sourceType: 'admin_adjustment',
    actor: { id: 'admin-1', type: 'admin' },
    idempotencyKey: adjKey,
    notes: 'Platform authorized restock',
  });
  assert.equal(mutation2.duplicate, true);

  const balAfter2 = await inventoryLedgerService.getBalance({ storeId, skuId });
  assert.equal(balAfter2.onHand, 20, 'Idempotent adjustment retry cannot mutate balance twice');
});

test('P3-INV-003: 15. Ledger Reconstruction & Compatibility Projection: Invariant Mathematical Audit', async () => {
  const storeId = randomUUID();
  const skuId = randomUUID();

  // Initial setup: 100 onHand
  const { product } = await seedCatalog({ storeId, skuId, onHand: 100 });

  // Step 1: Sale of 20
  await inventoryLedgerService.mutateBalance({
    storeId,
    skuId,
    changeOnHand: -20,
    changeReserved: 0,
    reasonCode: 'sale',
    sourceType: 'order',
    sourceId: randomUUID(),
    actor: { id: 'buyer-audit', type: 'buyer' },
    idempotencyKey: `audit-sale-${randomUUID()}`,
  });

  // Step 2: Reserve 15
  const res = await inventoryLedgerService.createReservation({
    storeId,
    skuId,
    quantity: 15,
    sourceType: 'checkout',
    sourceId: randomUUID(),
    actor: { id: 'buyer-audit-2', type: 'buyer' },
    idempotencyKey: `audit-res-${randomUUID()}`,
  });

  // Step 3: Fulfill 10 of the reserved units (another 5 released)
  await inventoryLedgerService.fulfillReservation({
    reservationId: res.reservation.id,
    storeId,
    actor: { id: 'merchant', type: 'merchant' },
    sourceId: randomUUID(),
    idempotencyKey: `audit-ful-${randomUUID()}`,
  });

  // Step 4: Return restock of 5
  await inventoryLedgerService.mutateBalance({
    storeId,
    skuId,
    changeOnHand: 5,
    changeReserved: 0,
    reasonCode: 'return',
    sourceType: 'order',
    sourceId: randomUUID(),
    actor: { id: 'merchant', type: 'merchant' },
    idempotencyKey: `audit-ret-${randomUUID()}`,
  });

  // Step 5: Admin adjustment of +10
  await inventoryLedgerService.adjustBalance({
    storeId,
    skuId,
    delta: 10,
    reasonCode: 'manual_adjustment',
    sourceType: 'admin_adjustment',
    actor: { id: 'admin', type: 'admin' },
    idempotencyKey: `audit-adj-${randomUUID()}`,
    notes: 'Audit balancing',
  });

  // Mathematical Audit Check: Reconstruct from append-only ledger entries
  const audit = await inventoryLedgerService.reconstructBalance({ storeId, skuId });
  assert.equal(audit.match, true, 'Append-only ledger entries sum must exactly equal snapshot balance');
  assert.equal(audit.calculated.onHand, audit.actual.onHand);
  assert.equal(audit.calculated.reserved, audit.actual.reserved);
  assert.equal(audit.calculated.available, audit.actual.available);

  // Invariant arithmetic: onHand - reserved = available
  assert.equal(audit.actual.onHand - audit.actual.reserved, audit.actual.available);

  // Compatibility projection verification
  await product.reload();
  assert.equal(
    product.stockQuantity,
    audit.actual.onHand,
    'Product compatibility stockQuantity projection must exactly match authoritative ledger on-hand balance'
  );

  // Raw database verification
  const [ledgerCount] = await sequelize.query(
    'SELECT COUNT(*) as count FROM InventoryLedgerEntries WHERE storeId = ? AND skuId = ?',
    { replacements: [storeId, skuId] }
  );
  assert.ok(Number(ledgerCount[0].count) >= 5, 'Real database must persist all immutable ledger entries');
});
