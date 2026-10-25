// Central marketplace cart routes under /api/cart (no websiteId). app.js mounts
// this router before the storefront cart router, so /api/cart/clear is matched
// here before /api/cart/:websiteId. Middleware is applied per route, so
// storefront cart requests pass through untouched.
const express = require("express");
const { verifyToken, verifyOptionalCoreBuyer } = require('../../middlewares/authMiddleware');
const sessionMiddleware = require('../../middlewares/sessionMiddleware');
const { enforceCustomDomainBoundary } = require('../../middlewares/customDomainBoundary');
const marketplaceController = require("./marketplaceCheckoutController");

const router = express.Router();
const buyer = [sessionMiddleware, verifyToken, verifyOptionalCoreBuyer];

router.get("/", buyer, marketplaceController.getCart);
router.post("/items", buyer, enforceCustomDomainBoundary('cart'), marketplaceController.addToCart);
router.patch("/items/:itemId", buyer, enforceCustomDomainBoundary('cart'), marketplaceController.updateCartItem);
router.put("/items/:itemId", buyer, enforceCustomDomainBoundary('cart'), marketplaceController.updateCartItem);
router.delete("/items/:itemId", buyer, enforceCustomDomainBoundary('cart'), marketplaceController.removeCartItem);
router.delete("/clear", buyer, enforceCustomDomainBoundary('cart'), marketplaceController.clearCart);
router.delete("/", buyer, enforceCustomDomainBoundary('cart'), marketplaceController.clearCart);

module.exports = router;
