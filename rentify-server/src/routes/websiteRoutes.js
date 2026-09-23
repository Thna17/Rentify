// routes/websites.js
const express = require('express');
const router = express.Router();
const websiteController = require('../controllers/websiteController');
const { verifyToken } = require('../middlewares/auth');
const { validateCreateWebsite } = require('../middlewares/validation');
const { uploadImage, uploadPDF } = require('../controllers/uploadController');
const { imageUpload, pdfUpload } = require('../middlewares/multer');
const { requireWebsiteOwner, requireContentOwner } = require('../middlewares/authorization');

router.get('/merchant', verifyToken, websiteController.getWebsiteForMerchant);
router.get('/getWebsiteByDomain', websiteController.getWebsiteByDomain);
router.put('/theme/:websiteId', verifyToken, requireWebsiteOwner, websiteController.updateThemeConfiguration);
router.put('/content/:contentId', verifyToken, requireContentOwner, websiteController.updateWebsiteContent);
router.get('/theme/:websiteId', verifyToken, requireWebsiteOwner, websiteController.getThemeConfiguration);
router.get('/cache/stats', verifyToken, websiteController.getCacheStats);
router.post('/cache/clear', verifyToken, websiteController.clearCache);

router.post('/', verifyToken, validateCreateWebsite, websiteController.createWebsite);
router.get('/', verifyToken, websiteController.getWebsite);
router.get('/validate/:websiteId', websiteController.validateWebsite);
router.get('/:websiteId/merchant-telegram', verifyToken, requireWebsiteOwner, websiteController.getMerchantTelegramInfo);
router.put('/:websiteId/color-palette', verifyToken, requireWebsiteOwner, websiteController.updateColorPalette);
router.post('/uploadImage/:websiteId', verifyToken, requireWebsiteOwner, imageUpload.single('image'), uploadImage);
router.post('/upload-pdf/:websiteId', verifyToken, requireWebsiteOwner, pdfUpload.single('pdf'), uploadPDF);
module.exports = router;
