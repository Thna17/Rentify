const test = require('node:test');
const assert = require('node:assert/strict');
const POSOrderStrategy = require('../../modules/orders/core/orderCreation/strategies/POSOrderStrategy');
const POSOrdersStrategy = require('../../modules/orders/core/orderRetrieval/strategies/POSOrdersStrategy');
const NicheStrategy = require('../../modules/orders/core/orderCreation/strategies/NicheStrategy');
const { Product, Order, OrderItem, Payment, Invoice, Customer, StoreAccess } = require('../../models');
const { createRequireStoreAccess } = require('../../middlewares/requireStoreAccess');
const { createRequireWebsiteAccess } = require('../../middlewares/requireWebsiteAccess');

test('marketplace POS: marketplace-only merchant can create POS cash order and deduct inventory without websiteId', async (t) => {
  const storeId = '22222222-3333-4444-5555-666666666666';
  const productId = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff';

  let currentStock = 25;
  let productStatus = 'active';

  const mockTransaction = { LOCK: { UPDATE: 'UPDATE' } };

  const mockProduct = {
    id: productId,
    websiteId: null, // marketplace-only product
    storeId,
    name: 'Handwoven Silk Scarf',
    slug: 'handwoven-silk-scarf',
    price: 45.00,
    status: productStatus,
    trackInventory: true,
    stockQuantity: currentStock,
    productType: 'physical',
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

  let createdOrderData = null;
  let createdInvoiceData = null;
  let createdCustomerData = null;

  const mockModels = {
    Product,
    ProductVariant: { findByPk: async () => null, findOne: async () => null },
    Order: {
      create: async (data) => {
        createdOrderData = { ...data };
        return {
          ...data,
          id: 'pos-store-order-1',
          update: async function(changes) {
            Object.assign(this, changes);
            Object.assign(createdOrderData, changes);
            return this;
          },
          toJSON: function() { return { ...this }; }
        };
      }
    },
    OrderItem: {
      create: async (data) => ({ ...data, toJSON: () => ({ ...data }) })
    },
    Invoice: {
      create: async (data) => {
        createdInvoiceData = { ...data };
        return { ...data, toJSON: () => ({ ...data }) };
      }
    },
    Customer: {
      findOne: async () => null,
      create: async (data) => {
        createdCustomerData = { ...data, id: 'cust-store-1' };
        return createdCustomerData;
      }
    }
  };

  const mockPaymentProcessor = {
    process: async (order, paymentMethod) => ({
      id: 'pay-store-1',
      orderId: order.id,
      amount: order.totalAmount,
      status: 'completed',
      paymentMethod,
      toJSON: () => ({ id: 'pay-store-1', status: 'completed', paymentMethod })
    })
  };

  const nicheStrategy = new NicheStrategy('ecommerce');
  const posStrategy = new POSOrderStrategy(mockModels, mockPaymentProcessor, {}, nicheStrategy);

  // Process POS order with storeId and NO websiteId
  const result = await posStrategy.processOrder({
    websiteId: null,
    storeId,
    items: [{ productId, quantity: 2, price: 45.00, productType: 'physical' }],
    paymentMethod: 'cash',
    cashierId: 'cashier-uuid-1',
    customerInfo: { name: 'Marketplace Walk-in', email: 'walkin@example.com', phone: '012345678' },
    currency: 'USD'
  }, mockTransaction);

  assert.equal(result.order.status, 'completed', 'POS order must be completed');
  assert.equal(result.order.stockDeducted, true, 'Stock deduction flag must be true');
  assert.equal(createdOrderData.storeId, storeId, 'Order must be assigned to the store');
  assert.equal(createdOrderData.websiteId, null, 'Website ID must be null for marketplace-only store');
  assert.equal(currentStock, 23, 'Inventory must be decremented from 25 to 23');
  assert.equal(createdInvoiceData.storeId, storeId, 'Invoice must have storeId');
  assert.equal(createdInvoiceData.websiteId, null, 'Invoice websiteId must be null');
  assert.equal(createdCustomerData.tenantStoreId, storeId, 'Customer tenantStoreId must be set to storeId');
});

test('marketplace POS: KHQR payment order creation for marketplace-only store', async (t) => {
  const storeId = '22222222-3333-4444-5555-666666666666';
  const productId = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff';

  const mockTransaction = { LOCK: { UPDATE: 'UPDATE' } };
  const mockProduct = {
    id: productId,
    websiteId: null,
    storeId,
    name: 'Handcrafted Mug',
    price: 12.00,
    status: 'active',
    trackInventory: true,
    stockQuantity: 10,
    productType: 'physical',
    version: 1,
    ProductVariants: [],
    update: async function() { return this; }
  };

  t.mock.method(Product, 'findByPk', async () => mockProduct);

  const mockModels = {
    Product,
    ProductVariant: { findByPk: async () => null },
    Order: {
      create: async (data) => ({
        ...data,
        id: 'khqr-order-1',
        update: async function() { return this; },
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
      id: 'pay-khqr-1',
      orderId: order.id,
      amount: order.totalAmount,
      status: 'pending',
      paymentMethod,
      transactionData: {
        rawQR: '000201010212...mock_qr',
        md5Hash: 'mock_md5_hash',
        qrCodeUrl: 'https://bakong.page.link/mock'
      },
      toJSON: function() { return { ...this }; }
    })
  };

  const nicheStrategy = new NicheStrategy('ecommerce');
  const posStrategy = new POSOrderStrategy(mockModels, mockPaymentProcessor, {}, nicheStrategy);

  const result = await posStrategy.processOrder({
    websiteId: null,
    storeId,
    items: [{ productId, quantity: 1, price: 12.00, productType: 'physical' }],
    paymentMethod: 'KHQR',
    cashierId: 'cashier-1',
    customerInfo: { name: 'QR Buyer' },
    currency: 'USD'
  }, mockTransaction);

  assert.equal(result.order.status, 'pending', 'KHQR order must initially be pending');
  assert.equal(result.khqrData.rawQR, '000201010212...mock_qr', 'QR string must be returned in khqrData');
  assert.equal(result.khqrData.md5Hash, 'mock_md5_hash', 'md5Hash must be returned in khqrData');
});

test('marketplace POS: POSOrdersStrategy retrieves orders by storeId when websiteId is null', async (t) => {
  const storeId = '22222222-3333-4444-5555-666666666666';

  const mockOrders = [
    {
      id: 'order-store-101',
      orderType: 'pos',
      status: 'completed',
      totalAmount: 90.00,
      createdAt: new Date(),
      storeId,
      websiteId: null,
      Payment: { paymentMethod: 'cash', status: 'completed' },
      OrderItems: [
        {
          productId: 'prod-1',
          quantity: 2,
          price: 45.00,
          Product: { id: 'prod-1', name: 'Silk Scarf', price: 45.00, sku: 'SCARF-01', images: [] }
        }
      ]
    }
  ];

  t.mock.method(Order, 'findAll', async (query) => {
    if (query?.where?.storeId === storeId || query?.where?.orderType === 'pos') {
      return mockOrders;
    }
    return [];
  });

  const strategy = new POSOrdersStrategy();
  strategy.models = { Order, WebsiteData: { findOne: async () => null }, StoreAccess: { findByPk: async () => ({ storeId }) } };

  let responseBody = null;
  const mockRes = {
    json: (body) => { responseBody = body; return mockRes; },
    status: () => mockRes
  };

  await strategy.execute({
    params: { storeId },
    query: {},
    store: { storeId }
  }, mockRes);

  assert.equal(responseBody.totalOrders, 1, 'Should return 1 POS order');
  assert.equal(responseBody.orders[0].id, 'order-store-101');
  assert.equal(responseBody.orders[0].items[0].product.name, 'Silk Scarf');
});

test('marketplace POS: createRequireStoreAccess permits store owner and permitted staff for website-less store', async () => {
  const storeId = '22222222-3333-4444-5555-666666666666';
  const ownerUserId = 'merchant-owner-uuid';

  const mockStore = {
    storeId,
    ownerUserId,
    websiteId: null, // No storefront website
    status: 'active'
  };

  const guard = createRequireStoreAccess({
    findStore: async () => mockStore,
    permissions: ['pos']
  });

  const response = () => ({
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  });

  // 1. Store Owner -> Allowed
  let ownerPassed = false;
  await guard(
    { user: { id: ownerUserId, type: 'user' }, params: { storeId } },
    response(),
    () => { ownerPassed = true; }
  );
  assert.equal(ownerPassed, true, 'Store owner must be permitted');

  // 2. Staff with "pos" permission -> Allowed
  let staffPassed = false;
  await guard(
    { user: { id: 'staff-1', type: 'staff', merchantId: ownerUserId, permissions: ['pos'] }, params: { storeId } },
    response(),
    () => { staffPassed = true; }
  );
  assert.equal(staffPassed, true, 'Staff with pos permission must be permitted');

  // 3. Staff with "manage_pos" permission -> Allowed
  let staffManagePosPassed = false;
  await guard(
    { user: { id: 'staff-2', type: 'staff', merchantId: ownerUserId, permissions: ['manage_pos'] }, params: { storeId } },
    response(),
    () => { staffManagePosPassed = true; }
  );
  assert.equal(staffManagePosPassed, true, 'Staff with manage_pos permission must be permitted');

  // 4. Staff without pos permission -> Denied 403
  const staffDenied = response();
  await guard(
    { user: { id: 'staff-3', type: 'staff', merchantId: ownerUserId, permissions: ['products'] }, params: { storeId } },
    staffDenied,
    () => assert.fail('Staff without pos permission should be denied')
  );
  assert.equal(staffDenied.statusCode, 403, 'Staff without pos permission must receive 403');
});

test('marketplace POS: createRequireWebsiteAccess gracefully resolves storeId passed to websiteId param', async () => {
  const storeId = '22222222-3333-4444-5555-666666666666';
  const ownerUserId = 'merchant-owner-uuid';

  const mockStore = {
    storeId,
    ownerUserId,
    websiteId: null,
    status: 'active'
  };

  const guard = createRequireWebsiteAccess({
    findWebsite: async () => null, // Website not found
    requiredPermissions: ['pos']
  });

  const response = () => ({
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  });

  // Mock StoreAccess.findByPk
  const originalFindByPk = StoreAccess.findByPk;
  StoreAccess.findByPk = async (id) => (id === storeId ? mockStore : null);

  try {
    let passed = false;
    const req = {
      user: { id: ownerUserId, type: 'user' },
      params: { websiteId: storeId } // Store ID passed in legacy websiteId param
    };
    await guard(req, response(), () => { passed = true; });
    assert.equal(passed, true, 'Legacy route calling with storeId must resolve store and succeed');
    assert.equal(req.store.storeId, storeId, 'req.store must be set on the request');
  } finally {
    StoreAccess.findByPk = originalFindByPk;
  }
});
