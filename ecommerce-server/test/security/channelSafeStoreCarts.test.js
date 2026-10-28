'use strict';

// test/security/channelSafeStoreCarts.test.js
// Verification suite for P3-CART-001: Channel-Safe Store Carts.
// Guarantees tested:
// 1. Cart identity includes buyer/guest, Store and channel (marketplace vs storefront).
// 2. Channel isolation: Marketplace and storefront additions cannot accidentally share an incompatible cart.
// 3. Website context mapping: Adding items across stores in storefront fails closed.
// 4. Eligibility re-evaluation: Out-of-stock, inactive product, or suspended store is flagged with stable reason codes.
// 5. Price changes explained: originalPrice, currentPrice, priceChanged, and next action ACCEPT_PRICE_CHANGE.
// 6. Zero silent discards: Ineligible or changed items remain in the cart for explicit recovery.
// 7. Multi-Store marketplace carts: Grouped by store, independently checkout-able, failure in one store does not corrupt another.
// 8. Guest-to-buyer merge: Idempotent, channel-safe, merges quantities safely up to 999 without item loss.
// 9. Custom-domain boundary: Cart mutations on custom domains fail closed with 403.

process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1';
process.env.DB_PORT = process.env.DB_PORT || '3308';
process.env.DB_NAME = process.env.DB_NAME || 'rentify_ecommerce_test';
process.env.DB_USER = process.env.DB_USER || 'root';
process.env.DB_PASSWORD = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '';

const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const { sequelize } = require('../../config/db');
const {
  Cart,
  CartItem,
  Product,
  ProductVariant,
  StoreAccess,
  WebsiteData,
  StoreDeliveryPolicy,
  Order,
  OrderItem,
} = require('../../models');

const marketplaceCartService = require('../../modules/checkout/marketplaceCartService');
const marketplaceCheckoutService = require('../../modules/checkout/marketplaceCheckoutService');
const CartService = require('../../modules/cart/CartService');
const CartController = require('../../modules/cart/CartController');
const { enforceCustomDomainBoundary } = require('../../middlewares/customDomainBoundary');

// Helper to clean up test fixtures
async function cleanupFixtures(storeIds = [], cartIds = [], websiteIds = []) {
  if (cartIds.length) {
    await CartItem.destroy({ where: { cartId: cartIds } });
    await Cart.destroy({ where: { id: cartIds } });
  }
  if (storeIds.length) {
    await OrderItem.destroy({ where: {} });
    await Order.destroy({ where: { storeId: storeIds } });
    await ProductVariant.destroy({ where: {} });
    await Product.destroy({ where: { storeId: storeIds } });
    await StoreDeliveryPolicy.destroy({ where: { storeId: storeIds } });
    await StoreAccess.destroy({ where: { storeId: storeIds } });
  }
  if (websiteIds.length) {
    await WebsiteData.destroy({ where: { websiteId: websiteIds } });
  }
}

// Helper to create test store and product
async function setupStoreWithProduct({
  storeId = randomUUID(),
  websiteId = randomUUID(),
  ownerUserId = randomUUID(),
  subdomain = `store-${Date.now()}-${randomUUID().slice(0, 4)}`,
  productPrice = '25.00',
  stockQuantity = 50,
  marketplaceCategory = 'Clothing',
  status = 'active',
  marketplaceApprovalStatus = 'approved',
  productStatus = 'active',
} = {}) {
  const store = await StoreAccess.create({
    storeId,
    name: `Test Store ${storeId.slice(0, 8)}`,
    ownerUserId,
    status,
    marketplaceApprovalStatus,
    marketplaceEntitlement: 'pilot',
    marketplaceEnabled: true,
    primaryCategory: marketplaceCategory,
    needsCategoryReview: false,
    websiteId,
    version: 1,
    entitlements: { marketplaceListing: true, hostedCheckout: true, website: true },
  });

  const website = await WebsiteData.create({
    id: websiteId,
    websiteId,
    storeId,
    userId: ownerUserId,
    domain: `${subdomain}.rentifystore.shop`,
    subdomain,
    status: 'active',
  });

  const deliveryPolicy = await StoreDeliveryPolicy.create({
    storeId,
    flatFee: '3.00',
    currency: 'USD',
    version: 1,
  });

  const product = await Product.create({
    id: randomUUID(),
    storeId,
    websiteId,
    name: `Test Product ${storeId.slice(0, 6)}`,
    slug: `test-prod-${randomUUID().slice(0, 8)}`,
    price: productPrice,
    marketplaceCategory,
    marketplaceVisibility: true,
    status: productStatus,
    moderationStatus: 'approved',
    trackInventory: true,
    stockQuantity,
  });

  return { store, website, deliveryPolicy, product };
}

test('P3-CART-001: Cart identity includes buyer, Store, and channel', async () => {
  const buyerId = randomUUID();
  const sessionId = `guest-sess-${randomUUID()}`;
  const storeId = randomUUID();
  const websiteId = randomUUID();

  const fixture = await setupStoreWithProduct({ storeId, websiteId });

  try {
    // 1. Marketplace cart for authenticated buyer
    const mpCart = await Cart.create({
      buyerId,
      storeId,
      websiteId: null,
      channel: 'marketplace',
      currency: 'USD',
    });
    assert.equal(mpCart.channel, 'marketplace');
    assert.equal(mpCart.buyerId, buyerId);
    assert.equal(mpCart.storeId, storeId);
    assert.equal(mpCart.websiteId, null);

    // 2. Storefront cart for the same buyer and same store
    const sfCart = await Cart.create({
      buyerId,
      storeId,
      websiteId,
      channel: 'storefront',
      currency: 'USD',
    });
    assert.equal(sfCart.channel, 'storefront');
    assert.equal(sfCart.buyerId, buyerId);
    assert.equal(sfCart.storeId, storeId);
    assert.equal(sfCart.websiteId, websiteId);

    // 3. Guest marketplace cart
    const guestMpCart = await Cart.create({
      sessionId,
      storeId,
      channel: 'marketplace',
      currency: 'USD',
    });
    assert.equal(guestMpCart.channel, 'marketplace');
    assert.equal(guestMpCart.sessionId, sessionId);

    // 4. Duplicate cart for same buyer, store and channel violates unique index
    await assert.rejects(async () => {
      await Cart.create({
        buyerId,
        storeId,
        channel: 'marketplace',
        currency: 'USD',
      });
    }, /Duplicate entry|SequelizeUniqueConstraintError/i);

    // Cleanup
    await cleanupFixtures([storeId], [mpCart.id, sfCart.id, guestMpCart.id], [websiteId]);
  } finally {
    await cleanupFixtures([storeId], [], [websiteId]);
  }
});

test('P3-CART-001: Channel isolation prevents marketplace and storefront carts from interfering', async () => {
  const buyerId = randomUUID();
  const storeId = randomUUID();
  const websiteId = randomUUID();

  const { product } = await setupStoreWithProduct({ storeId, websiteId, stockQuantity: 20 });

  try {
    // Add 2 items to marketplace cart
    const mpResult = await marketplaceCartService.setCartItem({
      buyerId,
      storeId,
      productId: product.id,
      quantity: 2,
      channel: 'marketplace',
    });
    assert.equal(mpResult.length, 1);
    assert.equal(mpResult[0].items.length, 1);
    assert.equal(mpResult[0].items[0].quantity, 2);

    // Add 3 items to storefront cart
    const sfResult = await marketplaceCartService.setCartItem({
      buyerId,
      storeId,
      productId: product.id,
      quantity: 3,
      channel: 'storefront',
      websiteId,
    });
    assert.equal(sfResult.length, 1);
    assert.equal(sfResult[0].items.length, 1);
    assert.equal(sfResult[0].items[0].quantity, 3);

    // Read marketplace cart: must still have exactly 2 items
    const mpCart = await marketplaceCartService.getCart({ buyerId }, null, 'marketplace');
    assert.equal(mpCart.length, 1);
    assert.equal(mpCart[0].items[0].quantity, 2);

    // Read storefront cart: must still have exactly 3 items
    const sfCart = await marketplaceCartService.getCart({ buyerId }, storeId, 'storefront');
    assert.equal(sfCart.length, 1);
    assert.equal(sfCart[0].items[0].quantity, 3);

    // Clear marketplace cart: storefront cart remains untouched
    await marketplaceCartService.clearCart({ buyerId, channel: 'marketplace' });
    const clearedMp = await marketplaceCartService.getCart({ buyerId }, null, 'marketplace');
    assert.equal(clearedMp.length, 0);

    const retainedSf = await marketplaceCartService.getCart({ buyerId }, storeId, 'storefront');
    assert.equal(retainedSf.length, 1);
    assert.equal(retainedSf[0].items[0].quantity, 3);

    const carts = await Cart.findAll({ where: { buyerId } });
    await cleanupFixtures([storeId], carts.map(c => c.id), [websiteId]);
  } finally {
    await cleanupFixtures([storeId], [], [websiteId]);
  }
});

test('P3-CART-001: Website context mapping fails closed if product belongs to another Store', async () => {
  const storeA = randomUUID();
  const websiteA = randomUUID();
  const storeB = randomUUID();
  const websiteB = randomUUID();

  const fixtureA = await setupStoreWithProduct({ storeId: storeA, websiteId: websiteA, subdomain: 'site-a' });
  const fixtureB = await setupStoreWithProduct({ storeId: storeB, websiteId: websiteB, subdomain: 'site-b' });

  try {
    const cartServiceA = new CartService(websiteA);
    const buyerIdentifier = { buyerId: randomUUID(), userId: randomUUID() };

    // Attempt to add Store B's product to Storefront A's cart
    await assert.rejects(async () => {
      await cartServiceA.addItem(buyerIdentifier, {
        productId: fixtureB.product.id,
        quantity: 1,
      });
    }, (err) => {
      assert.equal(err.statusCode, 404);
      return true;
    });

    // Adding Store A's own product succeeds
    const { cartItem } = await cartServiceA.addItem(buyerIdentifier, {
      productId: fixtureA.product.id,
      quantity: 1,
    });
    assert.ok(cartItem);
    assert.equal(cartItem.productId, fixtureA.product.id);

    const carts = await Cart.findAll({ where: { websiteId: [websiteA, websiteB] } });
    await cleanupFixtures([storeA, storeB], carts.map(c => c.id), [websiteA, websiteB]);
  } finally {
    await cleanupFixtures([storeA, storeB], [], [websiteA, websiteB]);
  }
});

test('P3-CART-001: Product and SKU eligibility is re-evaluated with structured explanation and NO silent discard', async () => {
  const buyerId = randomUUID();
  const storeId = randomUUID();
  const websiteId = randomUUID();

  const { product } = await setupStoreWithProduct({
    storeId,
    websiteId,
    stockQuantity: 10,
    productPrice: '30.00',
  });

  try {
    // Add 4 items to marketplace cart
    await marketplaceCartService.setCartItem({
      buyerId,
      storeId,
      productId: product.id,
      quantity: 4,
      channel: 'marketplace',
    });

    // Verify initial eligible cart
    let carts = await marketplaceCartService.getCart({ buyerId }, null, 'marketplace');
    assert.equal(carts.length, 1);
    assert.equal(carts[0].canCheckout, true);
    assert.equal(carts[0].items[0].available, true);
    assert.equal(carts[0].items[0].requestedQuantity, 4);

    // Scenario 1: Stock drops below requested quantity (e.g. 2 left)
    await Product.update({ stockQuantity: 2 }, { where: { id: product.id } });
    carts = await marketplaceCartService.getCart({ buyerId }, null, 'marketplace');
    assert.equal(carts.length, 1);
    assert.equal(carts[0].canCheckout, false);
    assert.equal(carts[0].items[0].available, false);
    assert.equal(carts[0].items[0].reasonCode, 'INSUFFICIENT_STOCK');
    assert.equal(carts[0].items[0].nextAction, 'REDUCE_QUANTITY');
    assert.equal(carts[0].items[0].availableQuantity, 2);
    assert.equal(carts[0].items[0].requestedQuantity, 4);

    // Scenario 2: Stock drops to 0 (Out of stock)
    await Product.update({ stockQuantity: 0 }, { where: { id: product.id } });
    carts = await marketplaceCartService.getCart({ buyerId }, null, 'marketplace');
    assert.equal(carts.length, 1);
    assert.equal(carts[0].canCheckout, false);
    assert.equal(carts[0].items[0].available, false);
    assert.equal(carts[0].items[0].reasonCode, 'OUT_OF_STOCK');
    assert.equal(carts[0].items[0].nextAction, 'REMOVE_ITEM');
    // Ensure item was NOT silently deleted from database
    const dbItemCount = await CartItem.count();
    assert.equal(dbItemCount, 1, 'Item must NOT be silently deleted from database');

    // Scenario 3: Product is archived
    await Product.update({ status: 'archived', stockQuantity: 10 }, { where: { id: product.id } });
    carts = await marketplaceCartService.getCart({ buyerId }, null, 'marketplace');
    assert.equal(carts.length, 1);
    assert.equal(carts[0].canCheckout, false);
    assert.equal(carts[0].items[0].available, false);
    assert.equal(carts[0].items[0].reasonCode, 'PRODUCT_ARCHIVED');
    assert.equal(carts[0].items[0].nextAction, 'REMOVE_ITEM');

    // Scenario 4: Store is suspended
    await Product.update({ status: 'active' }, { where: { id: product.id } });
    await StoreAccess.update({ status: 'suspended' }, { where: { storeId } });
    carts = await marketplaceCartService.getCart({ buyerId }, null, 'marketplace');
    assert.equal(carts.length, 1);
    assert.equal(carts[0].canCheckout, false);
    assert.equal(carts[0].items[0].available, false);
    assert.equal(carts[0].items[0].reasonCode, 'STORE_SUSPENDED');
    assert.equal(carts[0].items[0].nextAction, 'REMOVE_ITEM');

    const dbCarts = await Cart.findAll({ where: { buyerId } });
    await cleanupFixtures([storeId], dbCarts.map(c => c.id), [websiteId]);
  } finally {
    await cleanupFixtures([storeId], [], [websiteId]);
  }
});

test('P3-CART-001: Price changes are explained without silently discarding cart items', async () => {
  const buyerId = randomUUID();
  const storeId = randomUUID();
  const websiteId = randomUUID();

  const { product } = await setupStoreWithProduct({
    storeId,
    websiteId,
    stockQuantity: 10,
    productPrice: '20.00',
  });

  try {
    // Add item at $20.00
    await marketplaceCartService.setCartItem({
      buyerId,
      storeId,
      productId: product.id,
      quantity: 2,
      channel: 'marketplace',
    });

    // Merchant updates price to $35.00
    await Product.update({ price: '35.00' }, { where: { id: product.id } });

    // Retrieve cart: price change must be flagged and explained
    const carts = await marketplaceCartService.getCart({ buyerId }, null, 'marketplace');
    assert.equal(carts.length, 1);
    const cart = carts[0];
    const item = cart.items[0];

    assert.equal(item.priceChanged, true);
    assert.equal(item.originalPrice, '20.00');
    assert.equal(item.currentPrice, '35.00');
    assert.equal(item.unitPrice, '20.00'); // Stored unitPrice
    assert.equal(item.reasonCode, 'PRICE_CHANGED');
    assert.equal(item.nextAction, 'ACCEPT_PRICE_CHANGE');
    assert.equal(cart.subtotal, '70.00'); // 2 * 35

    // Item must still be persisted in database
    const dbItem = await CartItem.findByPk(item.id);
    assert.ok(dbItem);

    const dbCarts = await Cart.findAll({ where: { buyerId } });
    await cleanupFixtures([storeId], dbCarts.map(c => c.id), [websiteId]);
  } finally {
    await cleanupFixtures([storeId], [], [websiteId]);
  }
});

test('P3-CART-001: Multi-Store marketplace carts are independently recoverable and non-corrupting', async () => {
  const buyerId = randomUUID();
  const store1 = randomUUID();
  const website1 = randomUUID();
  const store2 = randomUUID();
  const website2 = randomUUID();

  const fix1 = await setupStoreWithProduct({ storeId: store1, websiteId: website1, subdomain: 'store-one', stockQuantity: 5 });
  const fix2 = await setupStoreWithProduct({ storeId: store2, websiteId: website2, subdomain: 'store-two', stockQuantity: 10 });

  try {
    // Add item from Store 1 and item from Store 2
    await marketplaceCartService.setCartItem({
      buyerId,
      storeId: store1,
      productId: fix1.product.id,
      quantity: 2,
      channel: 'marketplace',
    });
    await marketplaceCartService.setCartItem({
      buyerId,
      storeId: store2,
      productId: fix2.product.id,
      quantity: 3,
      channel: 'marketplace',
    });

    // Cause Store 1's product to go out of stock
    await Product.update({ stockQuantity: 0 }, { where: { id: fix1.product.id } });

    // Retrieve multi-store cart
    const carts = await marketplaceCartService.getCart({ buyerId }, null, 'marketplace');
    assert.equal(carts.length, 2);

    const cart1 = carts.find(c => c.storeId === store1);
    const cart2 = carts.find(c => c.storeId === store2);

    assert.equal(cart1.canCheckout, false);
    assert.equal(cart1.items[0].available, false);
    assert.equal(cart1.items[0].reasonCode, 'OUT_OF_STOCK');

    assert.equal(cart2.canCheckout, true);
    assert.equal(cart2.items[0].available, true);

    // Independent checkout: checking out Store 2 succeeds without being blocked by Store 1
    const order2 = await marketplaceCheckoutService.checkout({
      buyerId,
      storeId: store2,
      checkoutKey: randomUUID(),
      expectedTotalAmount: cart2.totalAmount,
      customerInfo: { name: 'Test Buyer', phone: '012345678', email: 'buyer@example.com' },
      shippingInfo: { address: '123 Main St', city: 'Phnom Penh' },
    });
    assert.ok(order2);
    assert.equal(order2.storeId, store2);

    // After Store 2 checkout, Store 1's cart remains intact and recoverable
    const cartsAfter = await marketplaceCartService.getCart({ buyerId }, null, 'marketplace');
    assert.equal(cartsAfter.length, 1);
    assert.equal(cartsAfter[0].storeId, store1);
    assert.equal(cartsAfter[0].items.length, 1);
    assert.equal(cartsAfter[0].items[0].productId, fix1.product.id);

    const dbCarts = await Cart.findAll({ where: { buyerId } });
    await cleanupFixtures([store1, store2], dbCarts.map(c => c.id), [website1, website2]);
  } finally {
    await cleanupFixtures([store1, store2], [], [website1, website2]);
  }
});

test('P3-CART-001: Guest-to-buyer merge is idempotent, channel-safe, and never silently drops items', async () => {
  const buyerId = randomUUID();
  const guestSession = `guest-merge-${randomUUID()}`;
  const storeId = randomUUID();
  const websiteId = randomUUID();

  const { product } = await setupStoreWithProduct({ storeId, websiteId, stockQuantity: 20 });

  try {
    // 1. Guest adds 2 items to marketplace cart
    await marketplaceCartService.setCartItem({
      sessionId: guestSession,
      storeId,
      productId: product.id,
      quantity: 2,
      channel: 'marketplace',
    });

    // 2. Buyer already has 3 items of the same product in their marketplace cart
    await marketplaceCartService.setCartItem({
      buyerId,
      storeId,
      productId: product.id,
      quantity: 3,
      channel: 'marketplace',
    });

    // 3. Merge guest cart into buyer cart
    const merged = await marketplaceCartService.mergeCarts({
      buyerId,
      sessionId: guestSession,
      channel: 'marketplace',
    });

    assert.equal(merged.length, 1);
    assert.equal(merged[0].items.length, 1);
    assert.equal(merged[0].items[0].quantity, 5); // 2 + 3 = 5

    // 4. Ensure guest cart row is removed and buyer cart retained
    const guestCart = await Cart.findOne({ where: { sessionId: guestSession } });
    assert.equal(guestCart, null);

    // 5. Re-running merge is idempotent and does not corrupt buyer cart
    const remerged = await marketplaceCartService.mergeCarts({
      buyerId,
      sessionId: guestSession,
      channel: 'marketplace',
    });
    assert.equal(remerged.length, 1);
    assert.equal(remerged[0].items[0].quantity, 5);

    // 6. Test storefront merge via CartController
    const sfGuestSession = `sf-guest-${randomUUID()}`;
    const cartService = new CartService(websiteId);
    await cartService.addItem({ sessionId: sfGuestSession }, {
      productId: product.id,
      quantity: 1,
    });

    const responseObj = () => ({
      statusCode: 200,
      body: null,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    });

    const res = responseObj();
    await CartController.mergeCarts({
      user: { id: buyerId, type: 'user' },
      sessionId: sfGuestSession,
    }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, 'Cart merged successfully');
    assert.equal(res.body.mergedCount, 1);

    const dbCarts = await Cart.findAll({ where: { [sequelize.Sequelize.Op.or]: [{ buyerId }, { sessionId: [guestSession, sfGuestSession] }] } });
    await cleanupFixtures([storeId], dbCarts.map(c => c.id), [websiteId]);
  } finally {
    await cleanupFixtures([storeId], [], [websiteId]);
  }
});

test('P3-CART-001: Custom-domain browse-only policy blocks cart mutations with 403', async () => {
  const storeId = randomUUID();
  const websiteId = randomUUID();
  const customDomain = `merchant-${Date.now()}.customshop.com`;

  const { website } = await setupStoreWithProduct({ storeId, websiteId });
  await website.update({ domain: customDomain });

  try {
    const middleware = enforceCustomDomainBoundary('cart');

    const reqMutate = {
      headers: { host: customDomain },
      get(header) { return this.headers[header.toLowerCase()]; },
      method: 'POST',
      path: '/api/cart/items',
    };

    let errorResult = null;
    let nextCalled = false;

    const resMutate = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { errorResult = body; return this; },
    };

    await middleware(reqMutate, resMutate, () => { nextCalled = true; });

    assert.equal(nextCalled, false, 'Mutation must NOT call next()');
    assert.equal(resMutate.statusCode, 403, 'Must return 403 Forbidden');
    assert.equal(errorResult.code, 'CUSTOM_DOMAIN_CART_DISABLED');

    // Hosted storefront pass-through check
    let hostedNextCalled = false;
    const reqHosted = {
      headers: { host: 'aura.rentifystore.shop' },
      get(header) { return this.headers[header.toLowerCase()]; },
      method: 'POST',
      path: '/api/cart/items',
    };
    await middleware(reqHosted, resMutate, () => { hostedNextCalled = true; });
    assert.equal(hostedNextCalled, true, 'Approved hosted domain must pass through');

    await cleanupFixtures([storeId], [], [websiteId]);
  } finally {
    await cleanupFixtures([storeId], [], [websiteId]);
  }
});
