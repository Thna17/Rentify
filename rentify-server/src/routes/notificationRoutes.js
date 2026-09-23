// routes/notificationRoutes.js (Port 3001)
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { verifyToken } = require('../middlewares/auth');
const { requireWebsiteOwner } = require('../middlewares/authorization');
const { requireServiceToken } = require('../middlewares/requireServiceToken');

router.post('/send', verifyToken, requireWebsiteOwner, notificationController.sendMerchantNotification);
router.post('/callback', requireServiceToken, notificationController.handleMerchantCallback);
router.post("/orders", requireServiceToken, notificationController.handleOrderNotification);
router.post("/orders/:orderId/process", verifyToken, notificationController.processOrder);

module.exports = router;
