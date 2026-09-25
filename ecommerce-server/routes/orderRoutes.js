const express = require("express");
const { verifyToken, verifyStoreActor } = require("../middlewares/authMiddleware");
const sessionMiddleware = require("../middlewares/sessionMiddleware");
const {
  getOrderHistory,
  getOrderById,
  getMyOrders,
  getMyOrderDetails,
  getMyOrderPayment,
  createPOSOrder,
  createInvoice,
  getPOSOrders
} = require("../controllers/OrderController");
const OrderController = require("../controllers/OrderController");

const router = express.Router();

const checkPermissions = require("../middlewares/checkPermissions");
const { requireWebsiteAccess, requireWebsitePermission, requireOrderAccess } = require("../middlewares/requireWebsiteAccess");
const { createRequireStoreAccess } = require("../middlewares/requireStoreAccess");

// Apply middlewares
router.use(sessionMiddleware);
router.use(verifyToken);

// Store-scoped POS routes
router.post(
  "/stores/:storeId/orders/pos",
  createRequireStoreAccess({ permissions: ["pos", "manage_pos"] }),
  createPOSOrder
);
router.get(
  "/stores/:storeId/orders/pos",
  createRequireStoreAccess({ permissions: ["pos", "manage_pos"] }),
  getPOSOrders
);

// Order routes
router.post("/websites/:websiteId/orders", OrderController.createOrder);
router.post("/websites/:websiteId/orders/pos", requireWebsitePermission(["pos"]), createPOSOrder);
router.post("/websites/:websiteId/orders/invoice", requireWebsitePermission(["invoice", "invoices"]), createInvoice);

router.get("/orders/:orderId", requireOrderAccess, getOrderById);
router.get("/websites/:websiteId/orders", requireWebsitePermission(["orders", "manage_orders"]), getOrderHistory);
router.get("/websites/:websiteId/my-orders", getMyOrders);
router.get("/websites/my-orders/:orderId", getMyOrderDetails);
router.get("/websites/my-orders/:orderId/payment", getMyOrderPayment);

router.get(
  "/websites/:websiteId/orders/pos",
  verifyToken,
  requireWebsitePermission(["pos"]),
  getPOSOrders
);
module.exports = router;
