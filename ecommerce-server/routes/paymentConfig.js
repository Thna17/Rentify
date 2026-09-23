const express = require("express");
const router = express.Router();
const {
  getPaymentConfig,
  updatePaymentConfig,
} = require("../controllers/paymentConfigController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { requireWebsitePermission } = require("../middlewares/requireWebsiteAccess");

router.get("/:websiteId", verifyToken, requireWebsitePermission(["payments", "manage_payments", "manage_settings"]), getPaymentConfig);
router.put("/:websiteId", verifyToken, requireWebsitePermission(["payments", "manage_payments", "manage_settings"]), updatePaymentConfig);

module.exports = router;
