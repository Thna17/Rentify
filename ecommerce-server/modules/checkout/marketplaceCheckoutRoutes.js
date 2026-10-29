const express = require('express');
const { verifyCoreBuyer, verifyOptionalCoreBuyer, verifyStoreActor } = require('../../middlewares/authMiddleware');
const { createRequireStoreAccess } = require('../../middlewares/requireStoreAccess');
const controller = require('./marketplaceCheckoutController');
const { requireMarketplaceCheckoutEnabled } = require('./marketplaceCheckoutGate');
const { enforceCustomDomainBoundary } = require('../../middlewares/customDomainBoundary');

const router = express.Router();
const requireBuyer = (req, res, next) => {
  if (req.user?.type !== 'user') return res.status(401).json({ error: 'Rentify buyer sign-in required' });
  if (!req.user.isVerified) return res.status(403).json({ error: 'Verify your Rentify account first' });
  next();
};

// Cart routes (guest session or authenticated buyer)
router.get('/marketplace/cart', verifyOptionalCoreBuyer, controller.getCart);
router.post('/marketplace/cart/items', verifyOptionalCoreBuyer, enforceCustomDomainBoundary('cart'), controller.addToCart);
router.put('/marketplace/cart/:storeId/items/:productId', verifyOptionalCoreBuyer, enforceCustomDomainBoundary('cart'), controller.setCartItem);
router.patch('/marketplace/cart/:storeId/items/:productId', verifyOptionalCoreBuyer, enforceCustomDomainBoundary('cart'), controller.setCartItem);
router.patch('/marketplace/cart/items/:itemId', verifyOptionalCoreBuyer, enforceCustomDomainBoundary('cart'), controller.updateCartItem);
router.put('/marketplace/cart/items/:itemId', verifyOptionalCoreBuyer, enforceCustomDomainBoundary('cart'), controller.updateCartItem);
router.delete('/marketplace/cart/:storeId/items/:productId', verifyOptionalCoreBuyer, enforceCustomDomainBoundary('cart'), controller.removeCartItem);
router.delete('/marketplace/cart/items/:id', verifyOptionalCoreBuyer, enforceCustomDomainBoundary('cart'), controller.removeCartItem);
router.delete('/marketplace/cart/:storeId', verifyOptionalCoreBuyer, enforceCustomDomainBoundary('cart'), controller.clearCart);
router.delete('/marketplace/cart', verifyOptionalCoreBuyer, enforceCustomDomainBoundary('cart'), controller.clearCart);
router.post('/marketplace/cart/merge', verifyCoreBuyer, requireBuyer, enforceCustomDomainBoundary('cart'), controller.mergeCarts);

// Checkout & orders (require verified buyer)
router.post('/marketplace/checkout', verifyCoreBuyer, requireBuyer, requireMarketplaceCheckoutEnabled, controller.checkout);
router.get('/marketplace/my-orders', verifyCoreBuyer, requireBuyer, controller.buyerOrders);
router.get('/marketplace/my-orders/:orderId', verifyCoreBuyer, requireBuyer, controller.buyerOrder);
router.get('/marketplace/my-orders/:orderId/events', verifyCoreBuyer, requireBuyer, controller.buyerOrderEvents);
router.post('/marketplace/my-orders/:orderId/reports/:type', verifyCoreBuyer, requireBuyer, controller.buyerReport);
router.get('/marketplace/reports/eligibility', verifyCoreBuyer, requireBuyer, controller.checkReportEligibility);
router.post('/marketplace/reports', verifyCoreBuyer, requireBuyer, controller.submitReport);
router.get('/marketplace/reports/my-reports', verifyCoreBuyer, requireBuyer, controller.myReports);
router.get('/marketplace/reports/:id', verifyCoreBuyer, requireBuyer, controller.getReport);
// This router is mounted at /api ahead of the storefront, product, category and
// cart routers, so merchant authentication must stay scoped to /stores.
// A bare router.use() would put every public /api request behind merchant sign-in.
router.use('/stores', verifyStoreActor);
router.get('/stores/:storeId/marketplace-delivery',
  createRequireStoreAccess({ permissions: ['orders', 'manage_settings'] }), controller.getDeliveryPolicy);
router.put('/stores/:storeId/marketplace-delivery',
  createRequireStoreAccess({ permissions: ['manage_settings'] }), controller.setDeliveryPolicy);
router.get('/stores/:storeId/orders',
  createRequireStoreAccess({ permissions: ['orders', 'manage_orders'] }), controller.merchantOrders);
router.get('/stores/:storeId/orders/:orderId',
  createRequireStoreAccess({ permissions: ['orders', 'manage_orders'] }), controller.merchantOrder);
router.post('/stores/:storeId/orders/:orderId/actions/:action',
  createRequireStoreAccess({ permissions: ['orders', 'manage_orders'] }), controller.merchantOrderAction);
router.get('/stores/:storeId/marketplace-orders',
  createRequireStoreAccess({ permissions: ['orders', 'manage_orders'] }), controller.sellerOrders);
router.get('/stores/:storeId/marketplace-orders/:orderId',
  createRequireStoreAccess({ permissions: ['orders', 'manage_orders'] }), controller.sellerOrder);
router.get('/stores/:storeId/marketplace-orders/:orderId/events',
  createRequireStoreAccess({ permissions: ['orders', 'manage_orders'] }), controller.orderEvents);
router.post('/stores/:storeId/marketplace-orders/:orderId/actions/:action',
  createRequireStoreAccess({ permissions: ['orders', 'manage_orders'] }), controller.sellerAction);

module.exports = router;
