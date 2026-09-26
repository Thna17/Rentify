// routes/categoryRoutes.js (port 4000)
const express = require("express");
const router = express.Router();
const categoryController = require("./categoryController");
const { verifyToken } = require("../../middlewares/authMiddleware");
const { requireWebsiteAccess, requireCategoryAccess } = require("../../middlewares/requireWebsiteAccess");

router.post("/:websiteId", verifyToken, requireWebsiteAccess, categoryController.createCategory);
router.put("/:id", verifyToken, requireCategoryAccess, categoryController.updateCategory);
router.delete("/:id", verifyToken, requireCategoryAccess, categoryController.deleteCategory);
router.get("/:websiteId", categoryController.getCategories);

module.exports = router;
