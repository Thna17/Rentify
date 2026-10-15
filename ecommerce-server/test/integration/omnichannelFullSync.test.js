const test = require('node:test');
const assert = require('node:assert/strict');
const POSOrderStrategy = require('../../core/orderCreation/strategies/POSOrderStrategy');
const OnlineOrderStrategy = require('../../core/orderCreation/strategies/OnlineOrderStrategy');
const NicheStrategy = require('../../core/orderCreation/strategies/NicheStrategy');
const { changeStock } = require('../../services/sharedStockService');
const { updateStock } = require('../../services/stockService');
const { Product, ProductVariant, Order, OrderItem, Payment, Invoice, Customer, Cart, CartItem, ShippingDetail } = require('../../models');

test('omnichannel full sync: POS, Storefront, and Marketplace share canonical inventory and status transitions', async (t) => {
  const storeId = 'store-uuid-canonical-1111';
  const websiteId = 'website-uuid-storefront-2222';
  const productId = 'prod-uuid-omnichannel-3333';

  let currentStock = 10;
  let currentStatus = 'active';
  let version = 1;

  const mockTransaction = { LOCK: { UPDATE: 'UPDATE' } };

  const mockProduct = {
    id: productId,
    storeId,
    websiteId,
    name: 'Silk Ikat Scarf',
    slug: 'silk-ikat-scarf',
    price: 30.00,
    status: currentStatus,
    trackInventory: true,
    stockQuantity: currentStock,
    productType: 'physical',
    version,
    ProductVariants: [],
    update: async function(changes) {
      if (changes.stockQuantity !== undefined) currentStock = changes.stockQuantity;
      if (changes.status !== undefined) currentStatus = changes.status;
      if (changes.version !== undefined) version = changes.version;
      Object.assign(this, changes);
      return this;
    },
    toJSON: function() {
      return { ...this, stockQuantity: currentStock, status: currentStatus, version };
    }
  };

  t.mock.method(Product, 'findByPk', async (id) => {
    if (id === productId) {
      mockProduct.stockQuantity = currentStock;
      mockProduct.status = currentStatus;
      mockProduct.version = version;
      return mockProduct;
    }
    return null;
  });

  t.mock.method(Product, 'findOne', async (query) => {
    if (query?.where?.id === productId || query?.where?.slug === 'silk-ikat-scarf') {
      mockProduct.stockQuantity = currentStock;
      mockProduct.status = currentStatus;
      mockProduct.version = version;
      return mockProduct;
    }
    return null;
  });

  const createdOrders = [];
  const mockModels = {
    Product,
    ProductVariant: {
      findByPk: async () => null,
      findOne: async () => null
    },
    Order: {
      create: async (data) => {
        const orderInstance = {
          ...data,
          id: `order-${createdOrders.length + 1}`,
          update: async function(changes) {
            Object.assign(this, changes);
            return this;
          },
          toJSON: function() { return { ...this }; }
        };
        createdOrders.push(orderInstance);
        return orderInstance;
      },
      findByPk: async (id) => createdOrders.find(o => o.id === id) || null
    },
    OrderItem: {
      create: async (data) => ({ ...data, toJSON: () => ({ ...data }) })
    },
    Invoice: {
      create: async (data) => ({ ...data, toJSON: () => ({ ...data }) })
    },
    Customer: {
      findOne: async () => null,
      create: async (data) => ({ ...data, id: 'cust-sync-1' })
    },
    ShippingDetail: {
      create: async (data) => ({ ...data, toJSON: () => ({ ...data }) })
    },
    Cart: {
      destroy: async () => 1
    },
    CartItem: {
      destroy: async () => 1
    }
  };

  const mockPaymentProcessor = {
    process: async (order, paymentMethod) => ({
      id: `pay-${order.id}`,
      orderId: order.id,
      amount: order.totalAmount,
      status: 'completed',
      paymentMethod,
      toJSON: () => ({ id: `pay-${order.id}`, status: 'completed', paymentMethod })
    })
  };

  const nicheStrategy = new NicheStrategy('ecommerce');
  const posStrategy = new POSOrderStrategy(mockModels, mockPaymentProcessor, {}, nicheStrategy);

  // ── Step 1: POS Order buys 3 units ──────────────────────────────────────
  const posResult = await posStrategy.processOrder({
    websiteId: null,
    storeId,
    items: [{ productId, quantity: 3, price: 30.00, productType: 'physical' }],
    paymentMethod: 'cash',
    cashierId: 'cashier-1',
    customerInfo: { name: 'Walk-in Buyer' },
    currency: 'USD'
  }, mockTransaction);

  assert.equal(posResult.order.status, 'completed');
  assert.equal(currentStock, 7, 'After POS order for 3 items, stock should be 7');
  assert.equal(currentStatus, 'active', 'Status remains active with remaining stock');

  // ── Step 2: Storefront Order buys 3 units ──────────────────────────────
  const onlineStrategy = new OnlineOrderStrategy(mockModels, mockPaymentProcessor, {}, nicheStrategy);
  const storefrontOrder = await onlineStrategy.createOrderRecord({
    websiteId,
    storeId,
    salesChannel: 'storefront',
    deliveryStatus: 'pending',
    orderType: 'online',
    currency: 'USD',
    subtotal: 90.00,
    totalAmount: 90.00,
    shippingFee: 0,
    taxTotal: 0,
    discountTotal: 0,
    stockDeducted: true
  }, { subtotal: 90, totalAmount: 90 }, mockTransaction);

  // Deduct inventory via shared niche strategy (same as OnlineOrderStrategy)
  await nicheStrategy.updateInventory([{ productId, quantity: 3 }], mockTransaction);

  assert.equal(currentStock, 4, 'After Storefront order for 3 items, stock should be 4');
  assert.equal(currentStatus, 'active', 'Status remains active with remaining stock');

  // ── Step 3: Marketplace Order buys remaining 4 units ────────────────────
  // Marketplace checkout uses changeStock directly under transaction
  await changeStock(productId, -4, mockTransaction);

  assert.equal(currentStock, 0, 'After Marketplace order for 4 items, stock should be 0');
  assert.equal(currentStatus, 'out_of_stock', 'Product must auto-transition to out_of_stock when depleted');

  // ── Step 4: Subsequent order attempts on ALL channels are blocked ──────
  // 4a. POS attempt blocked
  await assert.rejects(
    async () => {
      await posStrategy.processOrder({
        websiteId: null,
        storeId,
        items: [{ productId, quantity: 1, price: 30.00, productType: 'physical' }],
        paymentMethod: 'cash',
        cashierId: 'cashier-1',
        currency: 'USD'
      }, mockTransaction);
    },
    (err) => {
      assert.match(err.message, /Order item validation failed/);
      return true;
    },
    'POS order must fail when item is out_of_stock'
  );

  // 4b. Marketplace attempt blocked
  await assert.rejects(
    async () => {
      await changeStock(productId, -1, mockTransaction);
    },
    (err) => {
      assert.match(err.message, /Product is not available/);
      return true;
    },
    'Marketplace checkout must fail when item is out_of_stock'
  );

  // ── Step 5: Order cancellation / stock restoration re-activates item ─────
  // Simulating cancellation or restock of 4 units
  await changeStock(productId, 4, mockTransaction);

  assert.equal(currentStock, 4, 'Stock should be restored to 4');
  assert.equal(currentStatus, 'active', 'Product must auto-transition from out_of_stock to active upon restock');

  // ── Step 6: Channels can now successfully purchase again ────────────────
  const posResult2 = await posStrategy.processOrder({
    websiteId: null,
    storeId,
    items: [{ productId, quantity: 2, price: 30.00, productType: 'physical' }],
    paymentMethod: 'card',
    cashierId: 'cashier-1',
    currency: 'USD'
  }, mockTransaction);

  assert.equal(posResult2.order.status, 'completed');
  assert.equal(currentStock, 2, 'Stock should decrement from 4 to 2');
});

test('omnichannel full sync: variant-level stock deduction and auto-status synchronization', async (t) => {
  const productId = 'prod-parent-variant-1';
  const variantId = 'var-child-variant-1';

  let variantStock = 5;
  let variantStatus = 'active';

  const mockTransaction = { LOCK: { UPDATE: 'UPDATE' } };

  const mockParent = {
    id: productId,
    status: 'active',
    trackInventory: true
  };

  const mockVariant = {
    id: variantId,
    productId,
    stockQuantity: variantStock,
    status: variantStatus,
    trackInventory: true,
    version: 1,
    update: async function(changes) {
      if (changes.stockQuantity !== undefined) variantStock = changes.stockQuantity;
      if (changes.status !== undefined) variantStatus = changes.status;
      Object.assign(this, changes);
      return this;
    }
  };

  t.mock.method(Product, 'findByPk', async (id) => (id === productId ? mockParent : null));
  t.mock.method(ProductVariant, 'findOne', async (query) => {
    if (query?.where?.id === variantId && query?.where?.productId === productId) {
      mockVariant.stockQuantity = variantStock;
      mockVariant.status = variantStatus;
      return mockVariant;
    }
    return null;
  });

  // 1. Deduct 5 units
  await changeStock(productId, -5, mockTransaction, variantId);
  assert.equal(variantStock, 0, 'Variant stock depleted to 0');
  assert.equal(variantStatus, 'out_of_stock', 'Variant status auto-transitions to out_of_stock');

  // 2. Reject further purchase
  await assert.rejects(
    async () => {
      await changeStock(productId, -1, mockTransaction, variantId);
    },
    /Variant is not available/
  );

  // 3. Restore 2 units
  await changeStock(productId, 2, mockTransaction, variantId);
  assert.equal(variantStock, 2, 'Variant stock restored to 2');
  assert.equal(variantStatus, 'active', 'Variant status auto-transitions back to active');
});
