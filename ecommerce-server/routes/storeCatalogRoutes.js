const router = require('express').Router();
const controller = require('../controllers/storeCatalogController');
const { verifyToken } = require('../middlewares/authMiddleware');
const { createRequireStoreAccess } = require('../middlewares/requireStoreAccess');

router.get('/marketplace/categories', controller.categories);
router.get('/marketplace/products', controller.listPublic);
router.get('/marketplace/products/:productId', controller.getPublic);
router.get('/stores/:storeId/products', verifyToken,
  createRequireStoreAccess({ permissions: ['products', 'manage_products'] }), controller.listOwn);
router.post('/stores/:storeId/products', verifyToken,
  createRequireStoreAccess({ permissions: ['products', 'manage_products'] }), controller.create);
router.patch('/stores/:storeId/products/:productId', verifyToken,
  createRequireStoreAccess({ permissions: ['products', 'manage_products'] }), controller.update);

module.exports = router;
