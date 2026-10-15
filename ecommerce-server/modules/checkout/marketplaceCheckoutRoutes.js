const express = require('express');
const { verifyCoreBuyer, verifyOptionalCoreBuyer, verifyStoreActor } = require('../../middlewares/authMiddleware');
const { createRequireStoreAccess } = require('../../middlewares/requireStoreAccess');
const controller = require('./marketplaceCheckoutController');
const { requireMarketplaceCheckoutEnabled } = require('./marketplaceCheckoutGate');

const router = express.Router();
const requireBuyer = (req, res, next) => {
  if (req.user?.type !== 'user') return res.status(401).json({ error: 'Rentify buyer sign-in required' });
  if (!req.user.isVerified) return res.status(403).json({ error: 'Verify your Rentify account first' });
  next();
};

// Cart routes (guest session or authenticated buyer)
router.get('/marketplace/cart', verifyOptionalCoreBuyer, controller.getCart);
router.post('/marketplace/cart/items', verifyOptionalCoreBuyer, controller.addToCart);
router.put('/marketplace/cart/:storeId/items/:productId', verifyOptionalCoreBuyer, controller.setCartItem);
router.patch('/marketplace/cart/:storeId/items/:productId', verifyOptionalCoreBuyer, controller.setCartItem);
router.patch('/marketplace/cart/items/:itemId', verifyOptionalCoreBuyer, controller.updateCartItem);
router.put('/marketplace/cart/items/:itemId', verifyOptionalCoreBuyer, controller.updateCartItem);
router.delete('/marketplace/cart/:storeId/items/:productId', verifyOptionalCoreBuyer, controller.removeCartItem);
router.delete('/marketplace/cart/items/:id', verifyOptionalCoreBuyer, controller.removeCartItem);
router.delete('/marketplace/cart/:storeId', verifyOptionalCoreBuyer, controller.clearCart);
router.delete('/marketplace/cart', verifyOptionalCoreBuyer, controller.clearCart);
router.post('/marketplace/cart/merge', verifyCoreBuyer, requireBuyer, controller.mergeCarts);

// Checkout & orders (require verified buyer)
router.post('/marketplace/checkout', verifyCoreBuyer, requireBuyer, requireMarketplaceCheckoutEnabled, controller.checkout);
router.get('/marketplace/my-orders', verifyCoreBuyer, requireBuyer, controller.buyerOrders);
router.get('/marketplace/my-orders/:orderId', verifyCoreBuyer, requireBuyer, controller.buyerOrder);
router.post('/marketplace/my-orders/:orderId/reports/:type', verifyCoreBuyer, requireBuyer, controller.buyerReport);
// This router is mounted at /api ahead of the storefront, product, category and
// cart routers, so merchant authentication must stay scoped to /stores.
// A bare router.use() would put every public /api request behind merchant sign-in.
router.use('/stores', verifyStoreActor);
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
