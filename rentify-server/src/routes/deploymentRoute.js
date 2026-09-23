// routes/deployments.js
const express = require('express');
const router = express.Router();
const deploymentController = require('../controllers/deploymentController');
const { verifyToken } = require('../middlewares/auth');
const { requireWebsiteOwner, requireDeploymentOwner } = require('../middlewares/authorization');

router.post('/:websiteId/publish', verifyToken, requireWebsiteOwner, deploymentController.publishWebsite);
router.get('/:deploymentId/status', verifyToken, requireDeploymentOwner, deploymentController.checkDeploymentStatus);
router.put('/status', verifyToken, requireWebsiteOwner, deploymentController.updateWebsiteStatus);

module.exports = router;
