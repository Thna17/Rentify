const express = require('express');
const { verifyToken } = require('../middlewares/authMiddleware');
const { createRequireStoreAccess } = require('../middlewares/requireStoreAccess');
const controller = require('../controllers/marketplaceCheckoutController');
const { requireMarketplaceCheckoutEnabled } = require('../middlewares/marketplaceCheckoutGate');

const router = express.Router();
const requireBuyer = (req, res, next) => {
  if (req.user?.type !== 'user') return res.status(401).json({ error: 'Rentify buyer sign-in required' });
  if (!req.user.isVerified) return res.status(403).json({ error: 'Verify your Rentify account first' });
  next();
};

router.use(verifyToken);
router.get('/marketplace/cart', requireBuyer, controller.getCart);
router.put('/marketplace/cart/:storeId/items/:productId', requireBuyer,
  requireMarketplaceCheckoutEnabled, controller.setCartItem);
router.post('/marketplace/checkout', requireBuyer, requireMarketplaceCheckoutEnabled, controller.checkout);
router.get('/marketplace/my-orders', requireBuyer, controller.buyerOrders);
router.get('/marketplace/my-orders/:orderId', requireBuyer, controller.buyerOrder);
router.post('/marketplace/my-orders/:orderId/reports/:type', requireBuyer, controller.buyerReport);
router.get('/stores/:storeId/marketplace-delivery',
  createRequireStoreAccess({ permissions: ['orders', 'manage_settings'] }), controller.getDeliveryPolicy);
router.put('/stores/:storeId/marketplace-delivery',
  createRequireStoreAccess({ permissions: ['manage_settings'] }), controller.setDeliveryPolicy);
router.get('/stores/:storeId/marketplace-orders',
  createRequireStoreAccess({ permissions: ['orders', 'manage_orders'] }), controller.sellerOrders);
router.get('/stores/:storeId/marketplace-orders/:orderId',
  createRequireStoreAccess({ permissions: ['orders', 'manage_orders'] }), controller.sellerOrder);
router.get('/stores/:storeId/marketplace-orders/:orderId/events',
  createRequireStoreAccess({ permissions: ['orders', 'manage_orders'] }), controller.orderEvents);
router.post('/stores/:storeId/marketplace-orders/:orderId/actions/:action',
  createRequireStoreAccess({ permissions: ['orders', 'manage_orders'] }), controller.sellerAction);

module.exports = router;
