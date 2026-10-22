// ecommerce-server/test/integration/sharedFixtures.test.js - Integration test validating shared platform fixtures in Commerce API

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createPlatformScenario,
  createInMemoryModelAdapter,
  seedCommerceFixtures,
  cleanupCommerceFixtures,
} = require('../fixtures');
const { createRequireWebsiteAccess } = require('../../middlewares/requireWebsiteAccess');

test('shared fixtures: Commerce API successfully seeds, isolates catalogs, and enforces tenant security', async () => {
  const models = createInMemoryModelAdapter([
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

  const scenario = createPlatformScenario();
  const tracker = await seedCommerceFixtures(models, scenario);

  // 1. Verify two distinct StoreAccess projections exist
  const storeAccessA = await models.StoreAccess.findByPk(scenario.ids.marketplaceStoreId);
  const storeAccessB = await models.StoreAccess.findByPk(scenario.ids.storefrontStoreId);
  assert.ok(storeAccessA, 'StoreAccess A must exist');
  assert.ok(storeAccessB, 'StoreAccess B must exist');
  assert.equal(storeAccessA.websiteId, null);
  assert.equal(storeAccessB.websiteId, scenario.ids.storefrontWebsiteId);

  // 2. Multi-tenant catalog isolation
  const productsStoreA = await models.Product.findAll({ where: { storeId: scenario.ids.marketplaceStoreId } });
  const productsStoreB = await models.Product.findAll({ where: { storeId: scenario.ids.storefrontStoreId } });
  assert.equal(productsStoreA.length, 1, 'Store A must have exactly 1 product');
  assert.equal(productsStoreB.length, 1, 'Store B must have exactly 1 product');
  assert.equal(productsStoreA[0].id, scenario.ids.simpleProductId);
  assert.equal(productsStoreB[0].id, scenario.ids.variantProductId);

  // 3. Variant products and inventory
  const variants = await models.ProductVariant.findAll({ where: { productId: scenario.ids.variantProductId } });
  assert.equal(variants.length, 2, 'Variant product must have exactly 2 variants');
  const totalVariantStock = variants.reduce((sum, v) => sum + v.stockQuantity, 0);
  assert.equal(totalVariantStock, 25, 'Total variant stock must match product inventory');

  // 4. Cart isolation
  const carts = await models.Cart.findAll({ where: { customerId: scenario.ids.customerId } });
  assert.equal(carts.length, 2, 'Buyer must have distinct carts per store');
  const cartA = carts.find((c) => c.storeId === scenario.ids.marketplaceStoreId);
  const cartB = carts.find((c) => c.storeId === scenario.ids.storefrontStoreId);
  assert.ok(cartA && cartB, 'Both store-scoped carts must exist');
  assert.equal(cartA.websiteId, null);
  assert.equal(cartB.websiteId, scenario.ids.storefrontWebsiteId);

  // 5. COD Orders, Invoices, and Refunds
  const orderDelivered = await models.Order.findByPk(scenario.ids.storefrontDeliveredOrderId);
  assert.ok(orderDelivered);
  assert.equal(orderDelivered.status, 'completed');
  assert.equal(orderDelivered.salesChannel, 'storefront');
  assert.equal(orderDelivered.deliveryStatus, 'delivered');

  const invoice = await models.Invoice.findOne({ where: { orderId: orderDelivered.id } });
  assert.ok(invoice, 'Delivered order must have an Invoice');
  assert.equal(invoice.status, 'paid');
  assert.equal(invoice.invoiceNumber, scenario.invoices.deliveredInvoice.invoiceNumber);

  const orderRefunded = await models.Order.findByPk(scenario.ids.storefrontRefundedOrderId);
  assert.ok(orderRefunded);
  assert.equal(orderRefunded.status, 'refunded');
  assert.equal(orderRefunded.deliveryStatus, 'returned');

  const refundEvent = await models.OrderEvent.findOne({ where: { orderId: orderRefunded.id } });
  assert.ok(refundEvent, 'Refunded order must have an OrderEvent');
  assert.equal(refundEvent.eventType, 'refund_confirmed');
  assert.equal(refundEvent.eventData.reason, 'damaged_in_transit');

  // 6. Access Control: Staff permission and tenant enforcement
  const findWebsiteMock = async (websiteId) => models.WebsiteData.findOne({ where: { websiteId } });

  const requirePosAccess = createRequireWebsiteAccess({
    findWebsite: findWebsiteMock,
    requiredPermissions: ['pos'],
  });

  const responseHelper = () => ({
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  });

  // Staff member with pos permission should pass for Store B
  let staffPassed = false;
  await requirePosAccess(
    {
      user: {
        id: scenario.ids.staffId,
        type: 'staff',
        permissions: ['manage_pos', 'manage_products'],
        merchantId: scenario.ids.merchantStorefrontUserId,
      },
      params: { websiteId: scenario.ids.storefrontWebsiteId },
    },
    responseHelper(),
    () => { staffPassed = true; }
  );
  assert.equal(staffPassed, true, 'Staff with POS permission must be allowed');

  // Staff member without orders permission should fail when accessing orders
  const requireOrdersAccess = createRequireWebsiteAccess({
    findWebsite: findWebsiteMock,
    requiredPermissions: ['orders'],
  });
  const staffOrdersDenied = responseHelper();
  await requireOrdersAccess(
    {
      user: {
        id: scenario.ids.staffId,
        type: 'staff',
        permissions: ['manage_pos', 'manage_products'],
        merchantId: scenario.ids.merchantStorefrontUserId,
      },
      params: { websiteId: scenario.ids.storefrontWebsiteId },
    },
    staffOrdersDenied,
    () => assert.fail('Staff without orders permission must be denied')
  );
  assert.equal(staffOrdersDenied.statusCode, 403);

  // Unrelated merchant owner must be denied
  const crossMerchantDenied = responseHelper();
  await requirePosAccess(
    {
      user: {
        id: scenario.ids.merchantMarketplaceUserId,
        type: 'user',
      },
      params: { websiteId: scenario.ids.storefrontWebsiteId },
    },
    crossMerchantDenied,
    () => assert.fail('Unrelated merchant must be denied access')
  );
  assert.equal(crossMerchantDenied.statusCode, 403);

  // 7. Cleanup
  const counts = await cleanupCommerceFixtures(models, tracker);
  assert.equal(counts.StoreAccess, 2);
  assert.equal(counts.Product, 2);
  assert.equal(counts.Order, 3);
  assert.equal(await models.Product.count(), 0);
  assert.equal(await models.Order.count(), 0);
});
