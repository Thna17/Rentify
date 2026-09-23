const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { sequelize } = require('../config/db');
const { StoreAccess, WebsiteData, Product, Cart, CartItem, Order, OrderItem, Payment, OrderEvent } = require('../models');
const catalog = require('../services/storeCatalogService');
const checkout = require('../services/marketplaceCheckoutService');
const NicheStrategy = require('../core/orderCreation/strategies/NicheStrategy');

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
    const product = await catalog.create({ storeId, websiteId: null }, {
      name: 'Checkout smoke item', price: 12.5, stockQuantity: 1,
      marketplaceCategory: 'Clothing', status: 'active',
    });
    for (const buyerId of [buyerA, buyerB]) {
      await checkout.setCartItem({ buyerId, storeId, productId: product.id, quantity: 1 });
    }
    const payload = (buyerId) => ({
      buyerId, storeId, checkoutKey: randomUUID(),
      customerInfo: { name: 'Test Buyer', phone: '+85512345678' },
      shippingInfo: { address: 'Phnom Penh test address' },
    });
    const firstPayload = payload(buyerA);
    const secondPayload = payload(buyerB);
    const outcomes = await Promise.allSettled([checkout.checkout(firstPayload), checkout.checkout(secondPayload)]);
    assert.equal(outcomes.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(outcomes.filter((result) => result.status === 'rejected').length, 1);
    const winner = outcomes[0].status === 'fulfilled' ? outcomes[0].value : outcomes[1].value;
    const winningPayload = outcomes[0].status === 'fulfilled' ? firstPayload : secondPayload;
    assert.equal(winner.totalAmount, '12.50');
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
      actorId: ownerId, eventKey: collectionKey, action: 'collect_cod', details: { amount: '12.50' } });
    assert.equal(collected.payment.status, 'paid');
    assert.equal(collected.payment.collectedAmount, '12.50');
    await checkout.merchantAction({ storeId, orderId: winner.id,
      actorId: ownerId, eventKey: collectionKey, action: 'collect_cod', details: { amount: '12.50' } });
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

    const cancellationProduct = await catalog.create({ storeId, websiteId: null }, {
      name: 'Cancellation smoke item', price: 8, stockQuantity: 1,
      marketplaceCategory: 'Clothing', status: 'active',
    });
    await checkout.setCartItem({ buyerId: buyerB, storeId, productId: product.id, quantity: 0 });
    await checkout.setCartItem({ buyerId: buyerB, storeId, productId: cancellationProduct.id, quantity: 1 });
    const cancelPayload = payload(buyerB);
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
    const sharedPayload = payload(buyerA);
    const niche = new NicheStrategy('ecommerce');
    const crossChannel = await Promise.allSettled([
      checkout.checkout(sharedPayload),
      sequelize.transaction((transaction) => niche.updateInventory([
        { productId: sharedProduct.id, quantity: 1 },
      ], transaction)),
    ]);
    assert.equal(crossChannel.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal((await Product.findByPk(sharedProduct.id)).stockQuantity, 0);
    console.log('Marketplace COD checkout SQL smoke passed');
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
    await StoreAccess.destroy({ where: { storeId: [storeId, otherStoreId] } });
    await sequelize.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
