const express = require("express");
const { verifyToken } = require("../../middlewares/authMiddleware");
const { requireOrderAccess, requireWebsitePermission } = require("../../middlewares/requireWebsiteAccess");

const {
  confirmOrder,
  cancelOrder,
  processOrder,
  markAsComplete,
  handleReturnDecision,
  receiveReturnedItems,
  completeReturnProcess,
} = require("./MerchantOrderController");

const router = express.Router();

// Admin / Merchant order endpoints
router.post("/orders/:orderId/confirm", verifyToken, requireOrderAccess, requireWebsitePermission(["orders", "manage_orders"]), confirmOrder);
router.post("/orders/:orderId/cancel", verifyToken, requireOrderAccess, requireWebsitePermission(["orders", "manage_orders"]), cancelOrder);

router.post("/orders/:orderId/complete", verifyToken, requireOrderAccess, requireWebsitePermission(["orders", "manage_orders"]), markAsComplete);
router.post("/orders/:orderId/process", verifyToken, requireOrderAccess, requireWebsitePermission(["orders", "manage_orders"]), processOrder);

// Return lifecycle endpoints (P3-INV-002 Slice 6)
router.post("/orders/:orderId/returns/decision", verifyToken, requireOrderAccess, requireWebsitePermission(["orders", "manage_orders"]), handleReturnDecision);
router.post("/orders/:orderId/returns/receive", verifyToken, requireOrderAccess, requireWebsitePermission(["orders", "manage_orders", "inventory"]), receiveReturnedItems);
router.post("/orders/:orderId/returns/complete", verifyToken, requireOrderAccess, requireWebsitePermission(["orders", "manage_orders"]), completeReturnProcess);

module.exports = router;
