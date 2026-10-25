// Direct store POS routes under /api/stores/:storeId/orders/pos.
const router = require('express').Router();
const OrderController = require('./OrderController');
const { verifyStoreActor } = require('../../middlewares/authMiddleware');
const { createRequireStoreAccess } = require('../../middlewares/requireStoreAccess');

const posAuth = [
  verifyStoreActor,
  createRequireStoreAccess({ permissions: ['pos', 'manage_pos'] }),
];

// Barcode lookup scoped to store
router.get('/stores/:storeId/orders/pos/lookup', posAuth, OrderController.lookupPOSBarcode);

// Orders
router.post('/stores/:storeId/orders/pos', posAuth, OrderController.createPOSOrder);
router.get('/stores/:storeId/orders/pos', posAuth, OrderController.getPOSOrders);

// Void
router.post('/stores/:storeId/orders/pos/:orderId/void', posAuth, OrderController.voidPOSOrder);

// Manual KHQR recording
router.post('/stores/:storeId/orders/pos/:orderId/manual-khqr', posAuth, OrderController.recordManualKHQR);

module.exports = router;
