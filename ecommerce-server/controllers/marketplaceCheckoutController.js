const service = require('../services/marketplaceCheckoutService');

const wrap = (handler) => async (req, res, next) => {
  try { await handler(req, res); } catch (error) { next(error); }
};

module.exports = {
  getCart: wrap(async (req, res) => res.json({ carts: await service.getCart(req.user.id, req.query.storeId) })),
  setCartItem: wrap(async (req, res) => res.json({ carts: await service.setCartItem({
    buyerId: req.user.id, storeId: req.params.storeId, productId: req.params.productId,
    quantity: req.body.quantity,
  }) })),
  checkout: wrap(async (req, res) => res.status(201).json({ order: await service.checkout({
    buyerId: req.user.id, storeId: req.body.storeId,
    checkoutKey: req.get('Idempotency-Key') || req.body.idempotencyKey,
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
