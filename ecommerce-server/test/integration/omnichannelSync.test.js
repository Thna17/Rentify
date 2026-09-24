const test = require('node:test');
const assert = require('node:assert/strict');
const POSOrderStrategy = require('../../core/orderCreation/strategies/POSOrderStrategy');
const NicheStrategy = require('../../core/orderCreation/strategies/NicheStrategy');
const storeCatalog = require('../../services/storeCatalogService');
const { Product, Order, OrderItem, Payment, Invoice, Customer } = require('../../models');

test('omnichannel sync: POS card and cash payments immediately deduct canonical inventory and mark order completed', async (t) => {
  const storeId = '11111111-2222-3333-4444-555555555555';
  const websiteId = '66666666-7777-8888-9999-000000000000';
  const productId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

  let currentStock = 10;
  let productStatus = 'active';

  const mockTransaction = { LOCK: { UPDATE: 'UPDATE' } };

  const mockProduct = {
    id: productId,
    websiteId,
    storeId,
    name: 'Artisan Coffee Beans',
    slug: 'artisan-coffee-beans',
    price: 15.00,
    status: productStatus,
    trackInventory: true,
    stockQuantity: currentStock,
    productType: 'beverage',
    version: 1,
    ProductVariants: [],
    update: async function(changes) {
      if (changes.stockQuantity !== undefined) currentStock = changes.stockQuantity;
      if (changes.status !== undefined) productStatus = changes.status;
      Object.assign(this, changes);
      return this;
    }
  };

  t.mock.method(Product, 'findByPk', async (id) => {
    if (id === productId) {
      mockProduct.stockQuantity = currentStock;
      mockProduct.status = productStatus;
      return mockProduct;
    }
    return null;
  });

  const mockModels = {
    Product,
    ProductVariant: { findByPk: async () => null, findOne: async () => null },
    Order: {
      create: async (data) => ({
        ...data,
        id: 'order-pos-card-1',
        update: async function(changes) {
          Object.assign(this, changes);
          return this;
        },
        toJSON: function() { return { ...this }; }
      })
    },
    OrderItem: {
      create: async (data) => ({ ...data, toJSON: () => ({ ...data }) })
    },
    Invoice: {
      create: async (data) => ({ ...data, toJSON: () => ({ ...data }) })
    },
    Customer: {
      findOne: async () => null,
      create: async (data) => ({ ...data, id: 'cust-1' })
    }
  };

  const mockPaymentProcessor = {
    process: async (order, paymentMethod) => ({
      id: 'pay-1',
      orderId: order.id,
      amount: order.totalAmount,
      status: 'completed',
      paymentMethod,
      toJSON: () => ({ id: 'pay-1', status: 'completed', paymentMethod })
    })
  };

  const nicheStrategy = new NicheStrategy('cafe');
  const posStrategy = new POSOrderStrategy(mockModels, mockPaymentProcessor, {}, nicheStrategy);

  // 1. Process POS Card sale of 3 units
  const cardResult = await posStrategy.processOrder({
    websiteId,
    items: [{ productId, quantity: 3, price: 15.00, productType: 'beverage' }],
    paymentMethod: 'card',
    cashierId: 1,
    currency: 'USD'
  }, mockTransaction);

  assert.equal(cardResult.order.status, 'completed', 'POS card sale must be marked completed');
  assert.equal(cardResult.order.stockDeducted, true, 'POS card sale must mark stockDeducted as true');
  assert.equal(currentStock, 7, 'Canonical inventory must be decremented from 10 to 7');

  // 2. Process POS Cash sale of 7 units (depleting stock to 0)
  const cashResult = await posStrategy.processOrder({
    websiteId,
    items: [{ productId, quantity: 7, price: 15.00, productType: 'beverage' }],
    paymentMethod: 'cash',
    cashierId: 1,
    currency: 'USD'
  }, mockTransaction);

  assert.equal(cashResult.order.status, 'completed', 'POS cash sale must be marked completed');
  assert.equal(currentStock, 0, 'Canonical inventory must be decremented from 7 to 0');
  assert.equal(productStatus, 'out_of_stock', 'Product must automatically transition to out_of_stock when depleted');

  // 3. Attempt to sell when out of stock -> must throw stock error upfront
  await assert.rejects(
    async () => {
      await posStrategy.processOrder({
        websiteId,
        items: [{ productId, quantity: 1, price: 15.00, productType: 'beverage' }],
        paymentMethod: 'cash',
        cashierId: 1,
        currency: 'USD'
      }, mockTransaction);
    },
    (err) => {
      assert.match(err.message, /Order item validation failed/);
      assert.match(err.details[0].error, /not active|Insufficient stock/);
      return true;
    }
  );
});

test('omnichannel sync: storeCatalog auto-transitions status between out_of_stock and active upon restock', async (t) => {
  const storeId = '11111111-2222-3333-4444-555555555555';
  const productId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

  let savedStock = 0;
  let savedStatus = 'out_of_stock';

  const mockTransaction = { LOCK: { UPDATE: 'UPDATE' } };
  t.mock.method(Product.sequelize, 'transaction', async (callback) => callback(mockTransaction));

  const mockProduct = {
    id: productId,
    storeId,
    name: 'Handcrafted Ceramic Bowl',
    price: '28.00',
    stockQuantity: savedStock,
    status: savedStatus,
    version: 5,
    update: async function(changes) {
      if (changes.stockQuantity !== undefined) savedStock = changes.stockQuantity;
      if (changes.status !== undefined) savedStatus = changes.status;
      Object.assign(this, changes);
      return this;
    }
  };

  t.mock.method(Product, 'findOne', async () => mockProduct);

  // Restock 15 units without explicitly passing status
  await storeCatalog.update(storeId, productId, {
    expectedVersion: 5,
    stockQuantity: 15,
  });

  assert.equal(savedStock, 15, 'Stock quantity should be updated to 15');
  assert.equal(savedStatus, 'active', 'Status should auto-transition from out_of_stock to active');
});
