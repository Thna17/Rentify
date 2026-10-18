// tools/fixtures/commerceFixtures.js - Seeding and deterministic cleanup for Rentify Commerce API fixtures

const { assertSafeTestEnvironment } = require('./safety');
const { createPlatformScenario } = require('./scenario');

/**
 * Seeds Commerce models with a platform scenario and tracks all created record IDs.
 *
 * @param {object} models - Commerce models
 * @param {object} [scenario] - Platform scenario
 * @param {object} [options]
 * @returns {Promise<object>} Tracker object
 */
async function seedCommerceFixtures(models, scenario, options = {}) {
  assertSafeTestEnvironment(models);
  const activeScenario = scenario || createPlatformScenario(options);
  const transaction = options.transaction;

  const tracker = {
    scenario: activeScenario,
    models,
    created: {
      StoreAccess: [],
      WebsiteData: [],
      StoreDeliveryPolicy: [],
      Category: [],
      Product: [],
      ProductVariant: [],
      Customer: [],
      Cart: [],
      CartItem: [],
      Order: [],
      OrderItem: [],
      Payment: [],
      Invoice: [],
      ShippingDetail: [],
      OrderEvent: [],
    },
  };

  // 1. StoreAccess Projections
  if (models.StoreAccess && activeScenario.projections) {
    const list = [
      activeScenario.projections.storeAccessMarketplace,
      activeScenario.projections.storeAccessStorefront,
    ].filter(Boolean);
    for (const sa of list) {
      const record = await models.StoreAccess.create(sa, { transaction });
      tracker.created.StoreAccess.push(record.storeId || sa.storeId);
    }
  }

  // 2. WebsiteData Projection (Storefront only)
  if (models.WebsiteData && activeScenario.projections?.websiteDataStorefront) {
    const wd = activeScenario.projections.websiteDataStorefront;
    const record = await models.WebsiteData.create(wd, { transaction });
    tracker.created.WebsiteData.push(record.id || wd.id);
  }

  // 3. StoreDeliveryPolicy
  if (models.StoreDeliveryPolicy && activeScenario.projections) {
    const list = [
      activeScenario.projections.deliveryPolicyMarketplace,
      activeScenario.projections.deliveryPolicyStorefront,
    ].filter(Boolean);
    for (const p of list) {
      const record = await models.StoreDeliveryPolicy.create(p, { transaction });
      tracker.created.StoreDeliveryPolicy.push(record.storeId || p.storeId);
    }
  }

  // 4. Categories
  if (models.Category && activeScenario.categories) {
    const list = Object.values(activeScenario.categories);
    for (const cat of list) {
      const record = await models.Category.create(cat, { transaction });
      tracker.created.Category.push(record.id || cat.id);
    }
  }

  // 5. Products (Simple and Variant parents)
  if (models.Product && activeScenario.products) {
    const list = Object.values(activeScenario.products);
    for (const prod of list) {
      const record = await models.Product.create(prod, { transaction });
      tracker.created.Product.push(record.id || prod.id);
    }
  }

  // 6. Product Variants
  if (models.ProductVariant && activeScenario.productVariants) {
    const list = Object.values(activeScenario.productVariants);
    for (const variant of list) {
      const record = await models.ProductVariant.create(variant, { transaction });
      tracker.created.ProductVariant.push(record.id || variant.id);
    }
  }

  // 7. Customers
  if (models.Customer && activeScenario.customers) {
    const list = Object.values(activeScenario.customers);
    for (const cust of list) {
      const record = await models.Customer.create(cust, { transaction });
      tracker.created.Customer.push(record.id || cust.id);
    }
  }

  // 8. Carts
  if (models.Cart && activeScenario.carts) {
    const list = Object.values(activeScenario.carts);
    for (const cart of list) {
      const record = await models.Cart.create(cart, { transaction });
      tracker.created.Cart.push(record.id || cart.id);
    }
  }

  // 9. Cart Items
  if (models.CartItem && activeScenario.cartItems) {
    const list = Object.values(activeScenario.cartItems);
    for (const item of list) {
      const record = await models.CartItem.create(item, { transaction });
      tracker.created.CartItem.push(record.id || item.id);
    }
  }

  // 10. Orders
  if (models.Order && activeScenario.orders) {
    const list = Object.values(activeScenario.orders);
    for (const ord of list) {
      const record = await models.Order.create(ord, { transaction });
      tracker.created.Order.push(record.id || ord.id);
    }
  }

  // 11. Order Items
  if (models.OrderItem && activeScenario.orderItems) {
    const list = Object.values(activeScenario.orderItems);
    for (const item of list) {
      const record = await models.OrderItem.create(item, { transaction });
      tracker.created.OrderItem.push(record.id || item.id);
    }
  }

  // 12. Payments
  if (models.Payment && activeScenario.payments) {
    const list = Object.values(activeScenario.payments);
    for (const pay of list) {
      const record = await models.Payment.create(pay, { transaction });
      tracker.created.Payment.push(record.id || pay.id);
    }
  }

  // 13. Invoices
  if (models.Invoice && activeScenario.invoices) {
    const list = Object.values(activeScenario.invoices);
    for (const inv of list) {
      const record = await models.Invoice.create(inv, { transaction });
      tracker.created.Invoice.push(record.id || inv.id);
    }
  }

  // 14. Shipping Details
  if (models.ShippingDetail && activeScenario.shippingDetails) {
    const list = Object.values(activeScenario.shippingDetails);
    for (const ship of list) {
      const record = await models.ShippingDetail.create(ship, { transaction });
      tracker.created.ShippingDetail.push(record.id || ship.id);
    }
  }

  // 15. Order Events
  if (models.OrderEvent && activeScenario.orderEvents) {
    const list = Object.values(activeScenario.orderEvents);
    for (const evt of list) {
      const record = await models.OrderEvent.create(evt, { transaction });
      tracker.created.OrderEvent.push(record.id || evt.id);
    }
  }

  return tracker;
}

/**
 * Cleans up strictly the records created by seedCommerceFixtures in reverse topological order.
 *
 * @param {object} models - Commerce models
 * @param {object} trackerOrScenario - Tracker object or scenario
 * @param {object} [options]
 * @returns {Promise<object>} Deletion counts per model
 */
async function cleanupCommerceFixtures(models, trackerOrScenario, options = {}) {
  assertSafeTestEnvironment(models);
  const transaction = options.transaction;
  const deletedCounts = {};

  const created = trackerOrScenario?.created || {
    OrderEvent: Object.values(trackerOrScenario?.orderEvents || {}).map((e) => e.id),
    ShippingDetail: Object.values(trackerOrScenario?.shippingDetails || {}).map((s) => s.id),
    Invoice: Object.values(trackerOrScenario?.invoices || {}).map((i) => i.id),
    Payment: Object.values(trackerOrScenario?.payments || {}).map((p) => p.id),
    OrderItem: Object.values(trackerOrScenario?.orderItems || {}).map((oi) => oi.id),
    Order: Object.values(trackerOrScenario?.orders || {}).map((o) => o.id),
    CartItem: Object.values(trackerOrScenario?.cartItems || {}).map((ci) => ci.id),
    Cart: Object.values(trackerOrScenario?.carts || {}).map((c) => c.id),
    Customer: Object.values(trackerOrScenario?.customers || {}).map((cu) => cu.id),
    ProductVariant: Object.values(trackerOrScenario?.productVariants || {}).map((pv) => pv.id),
    Product: Object.values(trackerOrScenario?.products || {}).map((pr) => pr.id),
    Category: Object.values(trackerOrScenario?.categories || {}).map((cat) => cat.id),
    StoreDeliveryPolicy: [
      trackerOrScenario?.projections?.deliveryPolicyMarketplace?.storeId,
      trackerOrScenario?.projections?.deliveryPolicyStorefront?.storeId,
    ].filter(Boolean),
    WebsiteData: [trackerOrScenario?.projections?.websiteDataStorefront?.id].filter(Boolean),
    StoreAccess: [
      trackerOrScenario?.projections?.storeAccessMarketplace?.storeId,
      trackerOrScenario?.projections?.storeAccessStorefront?.storeId,
    ].filter(Boolean),
  };

  const cleanupSpecs = [
    { modelName: 'OrderEvent', key: 'id' },
    { modelName: 'ShippingDetail', key: 'id' },
    { modelName: 'Invoice', key: 'id' },
    { modelName: 'Payment', key: 'id' },
    { modelName: 'OrderItem', key: 'id' },
    { modelName: 'Order', key: 'id' },
    { modelName: 'CartItem', key: 'id' },
    { modelName: 'Cart', key: 'id' },
    { modelName: 'Customer', key: 'id' },
    { modelName: 'ProductVariant', key: 'id' },
    { modelName: 'Product', key: 'id' },
    { modelName: 'Category', key: 'id' },
    { modelName: 'StoreDeliveryPolicy', key: 'storeId' },
    { modelName: 'WebsiteData', key: 'id' },
    { modelName: 'StoreAccess', key: 'storeId' },
  ];

  for (const { modelName, key } of cleanupSpecs) {
    const ids = created[modelName];
    const model = models[modelName];
    if (model && Array.isArray(ids) && ids.length > 0) {
      deletedCounts[modelName] = await model.destroy({
        where: { [key]: ids },
        transaction,
      });
    } else {
      deletedCounts[modelName] = 0;
    }
  }

  return deletedCounts;
}

module.exports = {
  seedCommerceFixtures,
  cleanupCommerceFixtures,
};
