const router = require('express').Router();
const { verifyToken } = require('../middlewares/auth');
const controller = require('../controllers/storeController');
const sellerReviewController = require('../controllers/sellerReviewController');

router.use(verifyToken);
router.get('/mine', controller.getOwnStore);
router.post('/', controller.createStore);
router.patch('/mine', controller.updateOwnStore);
router.get('/mine/seller-application', sellerReviewController.getMine);
router.post('/mine/seller-application', sellerReviewController.submit);

module.exports = router;
