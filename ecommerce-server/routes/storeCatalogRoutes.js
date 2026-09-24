const router = require('express').Router();
const controller = require('../controllers/storeCatalogController');
const OrderController = require('../controllers/OrderController');
const { verifyStoreActor, verifyCoreBuyer } = require('../middlewares/authMiddleware');
const { createRequireStoreAccess } = require('../middlewares/requireStoreAccess');

const requireBuyer = (req, res, next) => {
  if (req.user?.type !== 'user') return res.status(401).json({ error: 'Rentify buyer sign-in required' });
  if (!req.user.isVerified) return res.status(403).json({ error: 'Verify your Rentify account first' });
  next();
};

router.get('/marketplace/categories', controller.categories);
router.get('/marketplace/products', controller.listPublic);
router.get('/marketplace/products/:productId', controller.getPublic);
router.get('/marketplace/products/:productId/reviews', controller.getProductReviews);
router.post('/marketplace/products/:productId/reviews', verifyCoreBuyer, requireBuyer, controller.addProductReview);
router.get('/stores/:storeId/products', verifyStoreActor,
  createRequireStoreAccess({ permissions: ['products', 'manage_products'] }), controller.listOwn);
router.post('/stores/:storeId/products', verifyStoreActor,
  createRequireStoreAccess({ permissions: ['products', 'manage_products'] }), controller.create);
router.patch('/stores/:storeId/products/:productId', verifyStoreActor,
  createRequireStoreAccess({ permissions: ['products', 'manage_products'] }), controller.update);

// Direct store POS routes under /api/stores/:storeId/orders/pos
router.post('/stores/:storeId/orders/pos', verifyStoreActor,
  createRequireStoreAccess({ permissions: ['pos', 'manage_pos'] }), OrderController.createPOSOrder);
router.get('/stores/:storeId/orders/pos', verifyStoreActor,
  createRequireStoreAccess({ permissions: ['pos', 'manage_pos'] }), OrderController.getPOSOrders);

module.exports = router;
