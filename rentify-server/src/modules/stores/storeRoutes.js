const router = require('express').Router();
const { verifyToken } = require('../../middlewares/auth');
const controller = require('./storeController');
const sellerReviewController = require('./sellerReviewController');
const { productImagesUpload, storeLogoUpload } = require('../../middlewares/multer');
const { uploadProductImages, deleteMedia } = require('../media').uploadController;
const { requireStoreAccess, createRequireStoreAccess } = require('../../middlewares/authorization');

const requireStoreAccessForRead = createRequireStoreAccess({ allowSuspended: true });

const requireOwnStoreOwner = async (req, res, next) => {
  if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
  const { Store } = require('../../models');
  const own = await Store.findOne({ where: { ownerUserId: req.user.id } });
  if (!own) return res.status(404).json({ error: 'Store not found' });
  if (own.ownerUserId !== req.user.id) return res.status(403).json({ error: 'Only the store owner can change the logo' });
  if (own.status !== 'active') return res.status(403).json({ error: 'Store is not active' });
  req.store = own;
  return next();
};

router.get('/categories', controller.getCategories);
router.get('/public', controller.listPublicStores);
router.get('/public/:storeId', controller.getPublicStore);
router.use(verifyToken);
router.get('/mine', controller.getOwnStore);
router.get('/mine/launch-checklist', controller.getLaunchChecklist);
router.get('/mine/entitlements', controller.getOwnStoreEntitlements);
router.post('/', controller.createStore);
router.patch('/mine', controller.updateOwnStore);
router.post('/mine/logo', requireOwnStoreOwner, storeLogoUpload, controller.uploadOwnLogo);
router.delete('/mine/media', requireOwnStoreOwner, deleteMedia);
router.get('/:storeId/entitlements', requireStoreAccessForRead, controller.getStoreEntitlements);
router.post('/:storeId/product-images', requireStoreAccess,
  productImagesUpload, uploadProductImages);
router.delete('/:storeId/media', requireStoreAccess, deleteMedia);
router.get('/mine/seller-application', sellerReviewController.getMine);
router.post('/mine/seller-application', sellerReviewController.submit);

module.exports = router;
