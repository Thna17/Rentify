const router = require('express').Router();
const { verifyToken } = require('../../middlewares/auth');
const controller = require('./storeController');
const sellerReviewController = require('./sellerReviewController');
const { productImagesUpload } = require('../../middlewares/multer');
const { uploadProductImages } = require('../websites/uploadController');
const { requireStoreAccess } = require('../../middlewares/authorization');

router.get('/categories', controller.getCategories);
router.get('/public', controller.listPublicStores);
router.get('/public/:storeId', controller.getPublicStore);
router.use(verifyToken);
router.get('/mine', controller.getOwnStore);
router.post('/', controller.createStore);
router.patch('/mine', controller.updateOwnStore);
router.post('/:storeId/product-images', requireStoreAccess,
  productImagesUpload, uploadProductImages);
router.get('/mine/seller-application', sellerReviewController.getMine);
router.post('/mine/seller-application', sellerReviewController.submit);

module.exports = router;
