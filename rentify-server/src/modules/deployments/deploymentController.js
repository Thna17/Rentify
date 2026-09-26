const deploymentService = require('./deploymentService');
const { logger } = require('../../utils/logger');
const { hostedStorefrontUrl } = require('../../utils/hostedStorefrontOrigin');
const ecommerceSyncService = require('../commerce-sync').ecommerceSyncService;

// A merchant may only record that a publish attempt failed or return to
// editing. Going live happens through publishWebsite, and suspension or expiry
// stays with Rentify, so neither can be set from the browser.
const MERCHANT_SETTABLE_STATUSES = new Set(['failed', 'customization']);

/** POST /api/deployments/:websiteId/publish — goes live on the Website's Rentify subdomain. */
exports.publishWebsite = async (req, res) => {
  try {
    const result = await deploymentService.publishWebsite(req.params.websiteId);
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error(`Publish failed: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

/** GET /api/deployments/:websiteId/status — current publish state and address. */
exports.checkDeploymentStatus = async (req, res) => {
  const { website } = req;
  res.json({
    status: website.status === 'active' ? 'READY' : String(website.status).toUpperCase(),
    url: website.subdomain ? hostedStorefrontUrl(website.subdomain) : null,
    subdomain: website.subdomain || null,
  });
};

/** PUT /api/deployments/status — limited status changes; see MERCHANT_SETTABLE_STATUSES. */
exports.updateWebsiteStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { website } = req;
    if (req.user.role !== 'admin' && !MERCHANT_SETTABLE_STATUSES.has(status)) {
      return res.status(403).json({ error: `Website status "${status}" cannot be set here` });
    }

    // The address is Rentify's to assign (or a verified custom domain), never a client value.
    await website.update({ status });
    await ecommerceSyncService.updateWebsiteStatus(website.id, status, website.domain);

    res.json({ success: true, status });
  } catch (error) {
    logger.error(`Website status update failed: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
};
