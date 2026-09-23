// routes/cart.js - UPDATED WITH ALL ENDPOINTS
const express = require("express");
const { verifyToken } = require('../middlewares/authMiddleware');
const sessionMiddleware = require('../middlewares/sessionMiddleware');
const CartController = require("../controllers/cartController");
const { requireWebsitePermission } = require("../middlewares/requireWebsiteAccess");

const router = express.Router();

// Apply middlewares
router.use(sessionMiddleware);
router.use(verifyToken);

// Cart routes
router.get("/:websiteId", CartController.getCart);
router.get("/:websiteId/summary", CartController.getCartSummary);
router.get("/:websiteId/analytics", requireWebsitePermission(["analytics", "manage_analytics"]), CartController.getCartAnalytics);
router.get("/:websiteId/validate-stock", CartController.validateCartStock);

router.post("/:websiteId/items", CartController.addToCart);
router.put("/:websiteId/items/:itemId", CartController.updateCartItem);
router.put("/:websiteId/items/:itemId/variant", CartController.updateCartItemVariant);
router.delete("/:websiteId/items/:itemId", CartController.removeFromCart);

router.delete("/:websiteId", CartController.clearCart);
router.post("/merge", CartController.mergeCarts);

module.exports = router;
