// routes/notificationRoutes.js (Port 3001)
const express = require('express');
const router = express.Router();
const notificationController = require('./notificationController');
const { verifyToken } = require('../../middlewares/auth');
const { requireWebsiteOwner } = require('../../middlewares/authorization');
const { requireServiceToken } = require('../../middlewares/requireServiceToken');
const durable = require('./durableNotificationController');
const safe = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);

router.post('/events', requireServiceToken, safe(durable.ingest));
router.get('/inbox', verifyToken, safe(durable.inbox));
router.patch('/inbox/:notificationId/read', verifyToken, safe(durable.setRead));
router.get('/preferences', verifyToken, safe(durable.getPreferences));
router.put('/preferences', verifyToken, safe(durable.updatePreferences));
router.get('/inbox/:notificationId/deliveries', verifyToken, safe(durable.deliveries));
router.post('/inbox/:notificationId/deliveries/:deliveryId/retry', verifyToken, safe(durable.retry));
router.get('/inbox/:notificationId/deliveries/:deliveryId/attempts', verifyToken, safe(durable.attempts));

router.post('/send', verifyToken, requireWebsiteOwner, notificationController.sendMerchantNotification);
router.post('/callback', requireServiceToken, notificationController.handleMerchantCallback);
router.post("/orders", requireServiceToken, notificationController.handleOrderNotification);
router.post("/orders/:orderId/process", verifyToken, notificationController.processOrder);

module.exports = router;
