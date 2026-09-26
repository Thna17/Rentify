const router = require('express').Router();
const { StoreAccess } = require('../../models');
const { verifyCoreBuyer } = require('../../middlewares/authMiddleware');
const { requireStorefrontCheckoutEnabled } = require('./marketplaceCheckoutGate');
const service = require('./marketplaceCheckoutService');

const wrap = (handler) => async (req, res, next) => {
  try { await handler(req, res); } catch (error) { next(error); }
};

router.use('/storefront/:websiteId', verifyCoreBuyer, async (req, res, next) => {
  try {
    if (!req.user?.isVerified) return res.status(403).json({ error: 'Verify your Rentify account first' });
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.websiteId)) {
      return res.status(400).json({ error: 'Invalid Website ID' });
    }
    const store = await StoreAccess.findOne({ where: { websiteId: req.params.websiteId } });
    if (!store) return res.status(404).json({ error: 'Storefront not found' });
    req.storeId = store.storeId;
    return next();
  } catch (error) { return next(error); }
});

router.get('/storefront/:websiteId/cart', wrap(async (req, res) => res.json({
  carts: await service.getCart(req.user.id, req.storeId, 'storefront'),
})));
router.put('/storefront/:websiteId/cart/items/:productId', requireStorefrontCheckoutEnabled,
  wrap(async (req, res) => res.json({ carts: await service.setCartItem({
    buyerId: req.user.id, storeId: req.storeId, productId: req.params.productId,
    quantity: req.body.quantity, channel: 'storefront',
  }) })));
router.post('/storefront/:websiteId/checkout', requireStorefrontCheckoutEnabled,
  wrap(async (req, res) => res.status(201).json({ order: await service.checkout({
    buyerId: req.user.id, storeId: req.storeId,
    checkoutKey: req.get('Idempotency-Key') || req.body.idempotencyKey,
    expectedTotalAmount: req.body.expectedTotalAmount,
    customerInfo: req.body.customerInfo, shippingInfo: req.body.shippingInfo,
    channel: 'storefront',
  }) })));
router.get('/storefront/:websiteId/my-orders', wrap(async (req, res) => res.json({
  orders: await service.buyerOrders(req.user.id, { storeId: req.storeId, channel: 'storefront' }),
})));
router.get('/storefront/:websiteId/my-orders/:orderId', wrap(async (req, res) => res.json({
  order: await service.buyerOrder(req.user.id, req.params.orderId,
    { storeId: req.storeId, channel: 'storefront' }),
})));
router.post('/storefront/:websiteId/my-orders/:orderId/reports/:type', wrap(async (req, res) =>
  res.status(201).json({ event: await service.buyerReport({
    buyerId: req.user.id, storeId: req.storeId, orderId: req.params.orderId,
    eventKey: req.get('Idempotency-Key') || req.body.idempotencyKey,
    type: req.params.type, details: req.body, channel: 'storefront',
  }) })));

module.exports = router;
