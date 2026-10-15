const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { sequelize } = require('../config/db');
const { StoreAccess, StoreDeliveryPolicy, WebsiteData, Product,
  Cart, CartItem, Order, OrderItem, Payment, OrderEvent } = require('../models');
const catalog = require('../modules/store-catalog/storeCatalogService');
const checkout = require('../modules/checkout/marketplaceCheckoutService');
const NicheStrategy = require('../modules/orders/core/orderCreation/strategies/NicheStrategy');
const { audit: auditCodOrders } = require('./auditMarketplaceCod');

async function run() {
  if (process.env.NODE_ENV !== 'test') throw new Error('Use an isolated test database');
  const storeId = randomUUID();
  const otherStoreId = randomUUID();
  const buyerA = randomUUID();
  const buyerB = randomUUID();
  const ownerId = randomUUID();
  const websiteId = randomUUID();
  try {
    for (const id of [storeId, otherStoreId]) {
      await StoreAccess.create({
        storeId: id, ownerUserId: ownerId, websiteId: null,
        primaryCategory: 'Fashion', needsCategoryReview: false, marketplaceEnabled: true,
        marketplaceApprovalStatus: 'approved', status: 'active',
        marketplaceEntitlement: 'pilot', version: 1,
      });
    }
    await checkout.setDeliveryPolicy(storeId, { flatFee: '3.50' });
    const product = await catalog.create({ storeId, websiteId: null }, {
      name: 'Checkout smoke item', price: 12.5, stockQuantity: 1,
      marketplaceCategory: 'Clothing', status: 'active',
    });
    for (const buyerId of [buyerA, buyerB]) {
      await checkout.setCartItem({ buyerId, storeId, productId: product.id, quantity: 1 });
    }
    const payload = (buyerId, expectedTotalAmount) => ({
      buyerId, storeId, checkoutKey: randomUUID(), expectedTotalAmount,
      customerInfo: { name: 'Test Buyer', phone: '+85512345678' },
      shippingInfo: { address: 'Phnom Penh test address' },
    });
    const quote = (await checkout.getCart(buyerA, storeId))[0];
    assert.equal(quote.deliveryFee, '3.50');
    assert.equal(quote.totalAmount, '16.00');
    assert.equal(quote.checkoutReady, true);
    const firstPayload = payload(buyerA, quote.totalAmount);
    const secondPayload = payload(buyerB, quote.totalAmount);
    const outcomes = await Promise.allSettled([checkout.checkout(firstPayload), checkout.checkout(secondPayload)]);
    assert.equal(outcomes.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(outcomes.filter((result) => result.status === 'rejected').length, 1);
    const winner = outcomes[0].status === 'fulfilled' ? outcomes[0].value : outcomes[1].value;
    const winningPayload = outcomes[0].status === 'fulfilled' ? firstPayload : secondPayload;
    assert.equal(winner.subtotal, '12.50');
    assert.equal(winner.deliveryFee, '3.50');
    assert.equal(winner.totalAmount, '16.00');
    assert.equal(winner.payment.status, 'pending');
    assert.equal((await Product.findByPk(product.id)).stockQuantity, 0);
    assert.equal(await Order.count({ where: { storeId } }), 1);
    assert.equal((await checkout.checkout(winningPayload)).id, winner.id);
    await assert.rejects(checkout.checkout({ ...winningPayload,
      shippingInfo: { address: 'Changed address' } }), { statusCode: 409 });
    await assert.rejects(checkout.buyerOrderForStore(otherStoreId, winner.id), { statusCode: 404 });
    const delivered = await checkout.merchantAction({ storeId, orderId: winner.id,
      actorId: ownerId, eventKey: randomUUID(), action: 'delivered' });
    assert.equal(delivered.deliveryStatus, 'delivered');
    assert.equal(delivered.payment.status, 'pending');
    const collectionKey = randomUUID();
    const collected = await checkout.merchantAction({ storeId, orderId: winner.id,
      actorId: ownerId, eventKey: collectionKey, action: 'collect_cod', details: { amount: '16.00' } });
    assert.equal(collected.payment.status, 'paid');
    assert.equal(collected.payment.collectedAmount, '16.00');
    await checkout.merchantAction({ storeId, orderId: winner.id,
      actorId: ownerId, eventKey: collectionKey, action: 'collect_cod', details: { amount: '16.00' } });
    await assert.rejects(checkout.merchantAction({ storeId, orderId: winner.id,
      actorId: ownerId, eventKey: collectionKey, action: 'collect_cod',
      details: { amount: '10.00' } }), { statusCode: 409 });
    assert.equal(await OrderEvent.count({ where: { eventKey: collectionKey } }), 1);
    const refund = await checkout.merchantAction({ storeId, orderId: winner.id,
      actorId: ownerId, eventKey: randomUUID(), action: 'confirm_refund',
      details: { amount: '4.00', method: 'cash', confirmation: 'Receipt verified' } });
    assert.equal(refund.payment.refundedAmount, '4.00');
    assert.equal(refund.payment.status, 'paid');
    const report = await checkout.buyerReport({ buyerId: winningPayload.buyerId,
      orderId: winner.id, eventKey: randomUUID(), type: 'complaint',
      details: { reason: 'Test complaint' } });
    assert.equal(report.type, 'complaint');

    await checkout.setDeliveryPolicy(storeId, { flatFee: '4.00', expectedVersion: 1 });
    assert.equal((await checkout.buyerOrder(winningPayload.buyerId, winner.id)).deliveryFee, '3.50');

    const cancellationProduct = await catalog.create({ storeId, websiteId: null }, {
      name: 'Cancellation smoke item', price: 8, stockQuantity: 1,
      marketplaceCategory: 'Clothing', status: 'active',
    });
    await checkout.setCartItem({ buyerId: buyerB, storeId, productId: product.id, quantity: 0 });
    await checkout.setCartItem({ buyerId: buyerB, storeId, productId: cancellationProduct.id, quantity: 1 });
    const cancelPayload = payload(buyerB, '12.00');
    await assert.rejects(checkout.checkout({ ...cancelPayload, expectedTotalAmount: '11.50' }),
      { statusCode: 409 });
    const sameKey = await Promise.all([checkout.checkout(cancelPayload), checkout.checkout(cancelPayload)]);
    assert.equal(sameKey[0].id, sameKey[1].id);
    assert.equal(await Order.count({ where: { checkoutKey: cancelPayload.checkoutKey } }), 1);
    const updatedProduct = await Product.findByPk(cancellationProduct.id);
    await catalog.update(storeId, cancellationProduct.id, {
      expectedVersion: updatedProduct.version, status: 'archived',
    });
    const cancelled = await checkout.merchantAction({ storeId, orderId: sameKey[0].id,
      actorId: ownerId, eventKey: randomUUID(), action: 'delivery_failed',
      details: { reason: 'Buyer unreachable', resolution: 'cancel' } });
    assert.equal(cancelled.status, 'cancelled');
    assert.equal(cancelled.payment.status, 'pending');
    const restoredProduct = await Product.findByPk(cancellationProduct.id);
    assert.equal(restoredProduct.stockQuantity, 1);
    assert.equal(restoredProduct.status, 'archived');

    const store = await StoreAccess.findByPk(storeId);
    await store.update({ websiteId });
    await WebsiteData.create({ websiteId, storeId, userId: ownerId, niche: 'ecommerce' });
    const sharedProduct = await catalog.create({ storeId, websiteId }, {
      name: 'Cross channel smoke item', price: 15, stockQuantity: 1,
      marketplaceCategory: 'Clothing', status: 'active',
    });
    await checkout.setCartItem({ buyerId: buyerA, storeId, productId: sharedProduct.id, quantity: 1 });
    const sharedPayload = payload(buyerA, '19.00');
    const niche = new NicheStrategy('ecommerce');
    const crossChannel = await Promise.allSettled([
      checkout.checkout(sharedPayload),
      sequelize.transaction((transaction) => niche.updateInventory([
        { productId: sharedProduct.id, quantity: 1 },
      ], transaction)),
    ]);
    assert.equal(crossChannel.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal((await Product.findByPk(sharedProduct.id)).stockQuantity, 0);
    const directProduct = await catalog.create({ storeId, websiteId }, {
      name: 'Storefront only smoke item', price: 10, stockQuantity: 1,
      marketplaceCategory: 'Clothing', marketplaceVisibility: false, status: 'active',
    });
    await store.update({ marketplaceApprovalStatus: 'pending' });
    await checkout.setCartItem({ buyerId: buyerB, storeId, productId: directProduct.id,
      quantity: 1, channel: 'storefront' });
    const directQuote = (await checkout.getCart(buyerB, storeId, 'storefront'))[0];
    assert.equal(directQuote.checkoutReady, true);
    assert.equal(directQuote.totalAmount, '14.00');
    await assert.rejects(checkout.setCartItem({ buyerId: buyerA, storeId,
      productId: directProduct.id, quantity: 1 }), { statusCode: 409 });
    const directOrder = await checkout.checkout({ ...payload(buyerB, directQuote.totalAmount),
      channel: 'storefront' });
    assert.equal(directOrder.salesChannel, 'storefront');
    assert.equal(directOrder.websiteId, websiteId);
    assert.equal(directOrder.payment.status, 'pending');
    assert.equal((await checkout.buyerOrders(buyerB)).some((order) => order.id === directOrder.id), false);
    assert.equal((await checkout.buyerOrders(buyerB, { storeId, channel: 'storefront' }))[0].id,
      directOrder.id);
    assert.equal((await Product.findByPk(directProduct.id)).stockQuantity, 0);
    await checkout.merchantAction({ storeId, orderId: directOrder.id,
      actorId: ownerId, eventKey: randomUUID(), action: 'delivered' });
    const directCollected = await checkout.merchantAction({ storeId, orderId: directOrder.id,
      actorId: ownerId, eventKey: randomUUID(), action: 'collect_cod',
      details: { amount: directQuote.totalAmount } });
    assert.equal(directCollected.payment.status, 'paid');
    const audit = await auditCodOrders({ storeId });
    assert.deepEqual(audit.findings, []);
    assert.equal(audit.channels.storefront.orderCount, 1);
    assert.ok(audit.channels.marketplace.orderCount >= 2);
    assert.equal(audit.channels.storefront.collected, '14.00');
    console.log('Marketplace and hosted storefront COD checkout SQL smoke passed');
  } finally {
    const orders = await Order.findAll({ where: { storeId }, attributes: ['id'] });
    const orderIds = orders.map((order) => order.id);
    if (orderIds.length) {
      await OrderEvent.destroy({ where: { orderId: orderIds } });
      await Payment.destroy({ where: { orderId: orderIds } });
      await OrderItem.destroy({ where: { orderId: orderIds } });
      await Order.destroy({ where: { id: orderIds } });
    }
    const carts = await Cart.findAll({ where: { storeId }, attributes: ['id'] });
    const cartIds = carts.map((cart) => cart.id);
    if (cartIds.length) await CartItem.destroy({ where: { cartId: cartIds } });
    await Cart.destroy({ where: { storeId } });
    await Product.destroy({ where: { storeId }, force: true });
    await WebsiteData.destroy({ where: { websiteId } });
    await StoreDeliveryPolicy.destroy({ where: { storeId } });
    await StoreAccess.destroy({ where: { storeId: [storeId, otherStoreId] } });
    await sequelize.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
