// routes/deploymentRoute.js
const express = require('express');
const router = express.Router();
const deploymentController = require('./deploymentController');
const { verifyToken } = require('../../middlewares/auth');
const { requireWebsiteOwner } = require('../../middlewares/authorization');

router.post('/:websiteId/publish', verifyToken, requireWebsiteOwner, deploymentController.publishWebsite);
router.get('/:websiteId/status', verifyToken, requireWebsiteOwner, deploymentController.checkDeploymentStatus);
router.put('/status', verifyToken, requireWebsiteOwner, deploymentController.updateWebsiteStatus);

module.exports = router;
