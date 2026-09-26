// services/deploymentService.js
const { Website, WebsiteTemplate } = require('../../models');
const { logger } = require('../../utils/logger');
const { getMerchantCache } = require('../../utils/cache');
const { hostedStorefrontDomain, hostedStorefrontUrl } = require('../../utils/hostedStorefrontOrigin');
const { assignSubdomain } = require('./hostedSubdomainService');
const ecommerceSyncService = require('../commerce-sync').ecommerceSyncService;

/**
 * Templates served by the single storefront app
 * (rentify-frontend/apps/storefront). It is deployed once; it reads the host,
 * finds the Website and loads that Website's template.
 */
const SUPPORTED_TEMPLATES = new Set([1, 2]);

class DeploymentService {
  /**
   * Publishes a Website on its Rentify subdomain. Nothing is built: the shared
   * storefront already serves every template, so publishing reserves the
   * address, marks the Website live and refreshes what the storefront reads.
   * Safe to repeat; a Website keeps its first subdomain.
   */
  async publishWebsite(websiteId) {
    const website = await Website.findByPk(websiteId, {
      include: [{ model: WebsiteTemplate, attributes: ['websiteTemplateId', 'name'] }],
    });
    if (!website) throw new Error('Website not found');
    const templateNumber = Number(website.WebsiteTemplate?.websiteTemplateId);
    if (!SUPPORTED_TEMPLATES.has(templateNumber)) {
      throw new Error(`Template ${website.WebsiteTemplate?.websiteTemplateId ?? '(none)'} cannot be published yet`);
    }
    if (!hostedStorefrontDomain()) {
      throw new Error('Storefront hosting is not configured (HOSTED_STOREFRONT_DOMAIN)');
    }

    const subdomain = await assignSubdomain(website);
    const url = hostedStorefrontUrl(subdomain);
    const publishedAt = new Date();
    const history = Array.isArray(website.deploymentHistory) ? website.deploymentHistory : [];

    await website.update({
      status: 'active',
      lastDeployment: publishedAt,
      deploymentHistory: [...history, { type: 'hosted-subdomain', url, at: publishedAt.toISOString() }].slice(-20),
    });
    await ecommerceSyncService.updateWebsiteStatus(website.id, 'active', new URL(url).host);
    await getMerchantCache().invalidateWebsiteCache(website.id);

    logger.info('Website published on hosted subdomain', { websiteId: website.id, subdomain });
    return { deploymentUrl: url, subdomain, status: 'READY' };
  }
}

module.exports = new DeploymentService();
