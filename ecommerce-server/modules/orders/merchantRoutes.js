const express = require("express");
const { verifyToken } = require("../../middlewares/authMiddleware");
const { requireOrderAccess, requireWebsitePermission } = require("../../middlewares/requireWebsiteAccess");

const {
  confirmOrder,
  cancelOrder,
  processOrder,
  markAsComplete,
} = require("./MerchantOrderController");

const router = express.Router();

// Admin endpoints
router.post("/orders/:orderId/confirm", verifyToken, requireOrderAccess, requireWebsitePermission(["orders", "manage_orders"]), confirmOrder);
router.post("/orders/:orderId/cancel", verifyToken, requireOrderAccess, requireWebsitePermission(["orders", "manage_orders"]), cancelOrder);

router.post("/orders/:orderId/complete", verifyToken, requireOrderAccess, requireWebsitePermission(["orders", "manage_orders"]), markAsComplete);
router.post("/orders/:orderId/process", verifyToken, requireOrderAccess, requireWebsitePermission(["orders", "manage_orders"]), processOrder);

module.exports = router;
