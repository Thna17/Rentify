const router = require('express').Router();
const controller = require('./storeCatalogController');
const { verifyStoreActor, verifyCoreBuyer } = require('../../middlewares/authMiddleware');
const { createRequireStoreAccess } = require('../../middlewares/requireStoreAccess');
const imports = require('./productImportController');

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
router.get('/stores/:storeId/product-imports/template', verifyStoreActor,
  createRequireStoreAccess({ permissions: ['products', 'manage_products'] }), imports.template);
router.get('/stores/:storeId/product-imports/export', verifyStoreActor,
  createRequireStoreAccess({ permissions: ['products', 'manage_products'] }), imports.exportProducts);
router.get('/stores/:storeId/product-imports', verifyStoreActor,
  createRequireStoreAccess({ permissions: ['products', 'manage_products'] }), imports.list);
router.post('/stores/:storeId/product-imports', verifyStoreActor,
  createRequireStoreAccess({ permissions: ['products', 'manage_products'] }), imports.upload, imports.preview);
router.get('/stores/:storeId/product-imports/:jobId', verifyStoreActor,
  createRequireStoreAccess({ permissions: ['products', 'manage_products'] }), imports.get);
router.post('/stores/:storeId/product-imports/:jobId/start', verifyStoreActor,
  createRequireStoreAccess({ permissions: ['products', 'manage_products'] }), imports.start);
router.post('/stores/:storeId/product-imports/:jobId/retry', verifyStoreActor,
  createRequireStoreAccess({ permissions: ['products', 'manage_products'] }), imports.start);
router.get('/stores/:storeId/product-imports/:jobId/report', verifyStoreActor,
  createRequireStoreAccess({ permissions: ['products', 'manage_products'] }), imports.report);

module.exports = router;
