const express = require("express");
const {
  getUsageSummary,
  getUsageBreakdown,
  getBillingSummary,
} = require("./usageAggregationController");
const { trackStoreView } = require("./usageController");
const { verifyToken } = require("../../middlewares/authMiddleware");

const router = express.Router();

router.post("/store-view", trackStoreView);
router.get("/summary", verifyToken, getUsageSummary);
router.get("/breakdown", verifyToken, getUsageBreakdown);
router.get("/billing", verifyToken, getBillingSummary);

module.exports = router;
