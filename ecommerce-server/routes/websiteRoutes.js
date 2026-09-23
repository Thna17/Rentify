// backend/routes/websiteData.js
const express = require("express");
const { 
  websiteData, 
  updateWebsiteData, 
  getWebsite, 
} = require('../controllers/websiteController');
const { verifyToken } = require('../middlewares/authMiddleware');
const { requireServiceToken } = require('../middlewares/requireServiceToken');
const router = express.Router();

router.get("/", verifyToken , getWebsite);
router.post("/", requireServiceToken, websiteData);
router.put("/:websiteId", requireServiceToken, updateWebsiteData);

module.exports = router;
