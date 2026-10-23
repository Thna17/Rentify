// Storefront (website-scoped) cart routes under /api/cart. The central marketplace
// cart routes are in checkout/marketplaceCartRoutes.js, mounted before this router.
const express = require("express");
const { verifyToken } = require('../../middlewares/authMiddleware');
const sessionMiddleware = require('../../middlewares/sessionMiddleware');
const CartController = require("./CartController");
const { requireWebsitePermission } = require("../../middlewares/requireWebsiteAccess");
const { enforceCustomDomainBoundary } = require("../../middlewares/customDomainBoundary");

const router = express.Router();

// Apply middlewares
router.use(sessionMiddleware);
router.use(verifyToken);

// Storefront website-scoped routes
router.get("/:websiteId", CartController.getCart);
router.get("/:websiteId/summary", CartController.getCartSummary);
router.get("/:websiteId/analytics", requireWebsitePermission(["analytics", "manage_analytics"]), CartController.getCartAnalytics);
router.get("/:websiteId/validate-stock", CartController.validateCartStock);

router.post("/:websiteId/items", enforceCustomDomainBoundary('cart'), CartController.addToCart);
router.put("/:websiteId/items/:itemId", enforceCustomDomainBoundary('cart'), CartController.updateCartItem);
router.put("/:websiteId/items/:itemId/variant", enforceCustomDomainBoundary('cart'), CartController.updateCartItemVariant);
router.delete("/:websiteId/items/:itemId", enforceCustomDomainBoundary('cart'), CartController.removeFromCart);

router.delete("/:websiteId", enforceCustomDomainBoundary('cart'), CartController.clearCart);
router.post("/merge", enforceCustomDomainBoundary('cart'), CartController.mergeCarts);

module.exports = router;
