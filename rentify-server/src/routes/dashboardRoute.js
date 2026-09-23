const express = require("express");
const router = express.Router();
// const { getWebsitesByUserId,getQuickStats } = require('../controllers/dashboardController');
const dashboardController = require('../controllers/dashboardController');
const { verifyToken } = require('../middlewares/auth');

router.get('/website/current', verifyToken, dashboardController.getCurrentWebsite);
router.get('/subscription/current', verifyToken, dashboardController.getUserSubscription);
module.exports = router;