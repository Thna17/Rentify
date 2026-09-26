// routes/cartRoutes.js - Central and Storefront Cart Routes
const express = require("express");
const { verifyToken, verifyOptionalCoreBuyer } = require('../../middlewares/authMiddleware');
const sessionMiddleware = require('../../middlewares/sessionMiddleware');
const CartController = require("./CartController");
const marketplaceController = require("../checkout/marketplaceCheckoutController");
const { requireWebsitePermission } = require("../../middlewares/requireWebsiteAccess");

const router = express.Router();

// Apply middlewares
router.use(sessionMiddleware);
router.use(verifyToken);

// Central marketplace cart routes (no websiteId required)
router.get("/", verifyOptionalCoreBuyer, marketplaceController.getCart);
router.post("/items", verifyOptionalCoreBuyer, marketplaceController.addToCart);
router.patch("/items/:itemId", verifyOptionalCoreBuyer, marketplaceController.updateCartItem);
router.put("/items/:itemId", verifyOptionalCoreBuyer, marketplaceController.updateCartItem);
router.delete("/items/:itemId", verifyOptionalCoreBuyer, marketplaceController.removeCartItem);
router.delete("/clear", verifyOptionalCoreBuyer, marketplaceController.clearCart);
router.delete("/", verifyOptionalCoreBuyer, marketplaceController.clearCart);

// Storefront website-scoped routes
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
