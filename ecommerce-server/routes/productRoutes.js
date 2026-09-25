// routes/products.js - COMPLETE and PROFESSIONAL
const express = require("express");
const { verifyToken } = require("../middlewares/authMiddleware");
const { requireWebsiteAccess, requireWebsitePermission } = require("../middlewares/requireWebsiteAccess");
const ProductController = require("../controllers/ProductController");

const router = express.Router();

// Public routes
router.get("/stores/:storeId", ProductController.getAllProducts);
router.get("/stores/:storeId/search", ProductController.searchProducts);
router.get("/:websiteId/analytics/overview", verifyToken, requireWebsitePermission(["products", "manage_products", "analytics"]), ProductController.getProductAnalytics);
router.get("/:websiteId/manage/config", verifyToken, requireWebsitePermission(["products", "manage_products"]), ProductController.getProductFormConfig);
router.get("/:websiteId/manage/products", verifyToken, requireWebsitePermission(["products", "manage_products"]), ProductController.getManagedProducts);
router.get("/:websiteId/manage/products/:productId", verifyToken, requireWebsitePermission(["products", "manage_products"]), ProductController.getManagedProductById);
router.get("/:websiteId", ProductController.getAllProducts);
router.get("/:websiteId/search", ProductController.searchProducts);
router.get("/:websiteId/recommended-options", ProductController.getRecommendedOptions);
router.get("/:websiteId/slug/:slug", ProductController.getProductBySlug);
router.get("/:websiteId/:productId", ProductController.getProductById);
router.get("/:websiteId/category/products", ProductController.getProductsByCategory);

// Protected routes (require authentication)
router.post("/:websiteId", verifyToken, requireWebsitePermission(["products", "manage_products"]), ProductController.createProduct);
router.post("/:websiteId/bulk", verifyToken, requireWebsitePermission(["products", "manage_products"]), ProductController.createBulkProducts);
router.post(
  "/:websiteId/bulk/csv",
  verifyToken,
  requireWebsitePermission(["products", "manage_products"]),
  ProductController.upload.single('file'),
  ProductController.bulkCreateFromCSV
);

router.put("/:websiteId/:productId", verifyToken, requireWebsitePermission(["products", "manage_products"]), ProductController.updateProduct);
router.patch("/:websiteId/:productId/inventory", verifyToken, requireWebsitePermission(["inventory", "products", "manage_products"]), ProductController.updateInventory);
router.patch("/:websiteId/bulk", verifyToken, requireWebsitePermission(["products", "manage_products"]), ProductController.bulkUpdateProducts);

router.delete("/:websiteId/:productId", verifyToken, requireWebsitePermission(["products", "manage_products"]), ProductController.deleteProduct);

// Advanced query routes
router.get("/:websiteId/filter/advanced", ProductController.getAllProducts);

module.exports = router;
