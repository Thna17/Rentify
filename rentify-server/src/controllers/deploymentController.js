const deploymentService = require('../services/deploymentService');
const Website = require('../models/Website');
const { logger } = require('../utils/logger');
const updateDeploymentUrls = require('../utils/updateDeploymentUrls')
const axios = require("axios");
const { ecommerceApiUrl } = require("../config/runtimeUrls");

exports.publishWebsite = async (req, res) => {
  try {
    const { websiteId } = req.params;
    const result = await deploymentService.initiateDeployment(websiteId);

    // Update website status
    await Website.update({
      status: 'building',
      vercelDeploymentId: result.vercelDeploymentId,
      domain: result.deploymentUrl
    }, { where: { id: websiteId } });
    
    updateDeploymentUrls(result.deploymentUrl);
  
  await axios.put(`${ecommerceApiUrl}/api/website-data/${websiteId}`, {
      domain: result.deploymentUrl,
      status: 'active'
    }, {
      headers: { "x-rentify-service-token": process.env.SERVICE_TO_SERVICE_TOKEN }
    });
    
    res.json({
      success: true,
      deploymentUrl: result.deploymentUrl,
      vercelDeploymentId: result.vercelDeploymentId
    });
  } catch (error) {
    logger.error(`Deployment failed: ${error.message}`);
    
    // Update website status to failed
    await Website.update(
      { status: 'failed' },
      { where: { id: req.params.websiteId } }
    );
    
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

exports.checkDeploymentStatus = async (req, res) => {
  try {
    const { deploymentId } = req.params;
    const status = await deploymentService.getDeploymentStatus(deploymentId);
    
    
    res.json({ status });
  } catch (error) {
    logger.error(`Status check failed: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

exports.updateWebsiteStatus = async (req, res) => {
  try {
    const { websiteId, status, domain } = req.body;
    
    const website = await Website.findByPk(websiteId);
    if (!website) return res.status(404).json({ error: "Website not found" });
    
    await website.update({ status, domain });
    
    res.json({ success: true, status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
