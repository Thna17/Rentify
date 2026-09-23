// routes/ecommerceStatsRoutes.js
const express = require('express');
const router = express.Router();
const statsController = require('../controllers/ecommerceStatsController');
const { verifyToken } = require('../middlewares/authMiddleware');
const { requireWebsitePermission, requirePlatformAdmin } = require('../middlewares/requireWebsiteAccess');
router.get('/websites/:websiteId', verifyToken, requireWebsitePermission(['analytics', 'manage_analytics']), statsController.getWebsiteStats);
router.get('/admin/', verifyToken, requirePlatformAdmin, statsController.getAdminStats);

module.exports = router;
