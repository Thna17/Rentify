// Direct store POS routes under /api/stores/:storeId/orders/pos.
const router = require('express').Router();
const OrderController = require('./OrderController');
const { verifyStoreActor } = require('../../middlewares/authMiddleware');
const { createRequireStoreAccess } = require('../../middlewares/requireStoreAccess');

router.post('/stores/:storeId/orders/pos', verifyStoreActor,
  createRequireStoreAccess({ permissions: ['pos', 'manage_pos'] }), OrderController.createPOSOrder);
router.get('/stores/:storeId/orders/pos', verifyStoreActor,
  createRequireStoreAccess({ permissions: ['pos', 'manage_pos'] }), OrderController.getPOSOrders);

module.exports = router;
