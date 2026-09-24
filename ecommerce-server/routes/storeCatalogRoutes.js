const router = require('express').Router();
const controller = require('../controllers/storeCatalogController');
const { verifyStoreActor } = require('../middlewares/authMiddleware');
const { createRequireStoreAccess } = require('../middlewares/requireStoreAccess');

router.get('/marketplace/categories', controller.categories);
router.get('/marketplace/products', controller.listPublic);
router.get('/marketplace/products/:productId', controller.getPublic);
router.get('/stores/:storeId/products', verifyStoreActor,
  createRequireStoreAccess({ permissions: ['products', 'manage_products'] }), controller.listOwn);
router.post('/stores/:storeId/products', verifyStoreActor,
  createRequireStoreAccess({ permissions: ['products', 'manage_products'] }), controller.create);
router.patch('/stores/:storeId/products/:productId', verifyStoreActor,
  createRequireStoreAccess({ permissions: ['products', 'manage_products'] }), controller.update);

module.exports = router;
