const service = require('./marketplaceCheckoutService');
const { Product } = require('../../models');

const wrap = (handler) => async (req, res, next) => {
  try { await handler(req, res); } catch (error) { next(error); }
};

const getIdentifier = (req) => ({
  buyerId: (req.user?.type === 'user' && req.user?.id) ? req.user.id : (req.buyer?.id || null),
  sessionId: req.sessionId || req.cookies?.sessionId || null,
});

module.exports = {
  getDeliveryPolicy: wrap(async (req, res) => res.json({ policy: await service.getDeliveryPolicy(req.params.storeId) })),
  setDeliveryPolicy: wrap(async (req, res) => res.json({ policy: await service.setDeliveryPolicy(
    req.params.storeId, req.body,
  ) })),
  getCart: wrap(async (req, res) => res.json({ carts: await service.getCart(getIdentifier(req), req.query.storeId) })),
  setCartItem: wrap(async (req, res) => res.json({ carts: await service.setCartItem({
    ...getIdentifier(req),
    storeId: req.params.storeId,
    productId: req.params.productId,
    variantId: req.body.variantId,
    quantity: req.body.quantity,
  }) })),
  addToCart: wrap(async (req, res) => {
    let storeId = req.body.storeId;
    if (!storeId && req.body.productId) {
      const product = await Product.findByPk(req.body.productId);
      storeId = product?.storeId;
    }
    const quantity = typeof req.body.quantity === 'number' ? req.body.quantity : 1;
    res.status(201).json({ carts: await service.setCartItem({
      ...getIdentifier(req),
      storeId,
      productId: req.body.productId,
      variantId: req.body.variantId,
      quantity,
      mode: 'add',
    }) });
  }),
  updateCartItem: wrap(async (req, res) => {
    let storeId = req.params.storeId || req.body.storeId;
    let productId = req.params.productId || req.body.productId;
    const quantity = typeof req.body.quantity === 'number' ? req.body.quantity : req.body.quantity;
    if (req.params.itemId) {
      return res.json({ carts: await service.updateCartItem({
        ...getIdentifier(req),
        itemId: req.params.itemId,
        quantity,
      }) });
    }
    res.json({ carts: await service.setCartItem({
      ...getIdentifier(req),
      storeId,
      productId,
      variantId: req.body.variantId,
      quantity: req.body.quantity,
    }) });
  }),
  removeCartItem: wrap(async (req, res) => {
    const rawId = req.params.id || req.params.itemId || req.params.productId;
    res.json({ carts: await service.removeCartItem({
      ...getIdentifier(req),
      storeId: req.params.storeId || req.body?.storeId,
      productId: req.params.storeId ? req.params.productId : (req.body?.productId || rawId),
      itemId: req.params.storeId ? undefined : (req.params.itemId || rawId),
      variantId: req.body?.variantId,
    }) });
  }),
  clearCart: wrap(async (req, res) => {
    res.json({ carts: await service.clearCart({
      ...getIdentifier(req),
      storeId: req.params.storeId,
    }) });
  }),
  mergeCarts: wrap(async (req, res) => {
    const sessionId = req.body?.sessionId || req.sessionId;
    res.json({ carts: await service.mergeCarts({
      buyerId: req.user.id,
      sessionId,
    }) });
  }),
  checkout: wrap(async (req, res) => res.status(201).json({ order: await service.checkout({
    buyerId: req.user.id, storeId: req.body.storeId,
    checkoutKey: req.get('Idempotency-Key') || req.body.idempotencyKey,
    expectedTotalAmount: req.body.expectedTotalAmount,
    customerInfo: req.body.customerInfo, shippingInfo: req.body.shippingInfo,
  }) })),
  buyerOrders: wrap(async (req, res) => res.json({ orders: await service.buyerOrders(req.user.id) })),
  buyerOrder: wrap(async (req, res) => res.json({ order: await service.buyerOrder(req.user.id, req.params.orderId) })),
  buyerReport: wrap(async (req, res) => res.status(201).json({ event: await service.buyerReport({
    buyerId: req.user.id, orderId: req.params.orderId,
    eventKey: req.get('Idempotency-Key') || req.body.idempotencyKey,
    type: req.params.type, details: req.body,
  }) })),
  sellerOrder: wrap(async (req, res) => res.json({ order: await service.buyerOrderForStore(
    req.params.storeId, req.params.orderId,
  ) })),
  sellerOrders: wrap(async (req, res) => res.json({ orders: await service.sellerOrders(req.params.storeId) })),
  orderEvents: wrap(async (req, res) => res.json({ events: await service.orderEvents(
    req.params.storeId, req.params.orderId,
  ) })),
  sellerAction: wrap(async (req, res) => res.json({ order: await service.merchantAction({
    storeId: req.params.storeId, orderId: req.params.orderId, actorId: req.user.id,
    eventKey: req.get('Idempotency-Key') || req.body.idempotencyKey,
    action: req.params.action, details: req.body,
  }) })),
};
