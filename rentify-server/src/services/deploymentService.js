// services/deploymentService.js
const { Website, WebsiteTemplate } = require('../models');
const { logger } = require('../utils/logger');
const VercelClient = require('../utils/vercelClient');
const runtimeUrls = require('../config/runtimeUrls');

const TEMPLATE_DEPLOYMENT_MAP = {
  1: {
    project: 'ecommerce-template-1',
    config: 'apps/templates/ecommerce/ecommerce-template-1/vite.config.ts',
    output: 'dist/apps/templates/ecommerce/ecommerce-template-1',
  },
  2: {
    project: 'ecommerce-template-2',
    config: 'apps/templates/ecommerce/ecommerce-template-2/vite.config.ts',
    output: 'dist/apps/templates/ecommerce/ecommerce-template-2',
  },
};

class DeploymentService {
  constructor() {
    this.vercel = new VercelClient();
  }

  /**
   * Initiate website deployment
   */
  async initiateDeployment(websiteId) {
    try {
      const website = await this.getWebsiteWithTemplate(websiteId);
      const websiteName = this.generateDeploymentName(website);
      
      logger.info('Initiating deployment', { websiteId, websiteName });

      const deployment = await this.vercel.createDeployment(
        websiteName,
        this.buildDeploymentConfig(website)
      );

      await this.vercel.updateProjectSettings(deployment.projectId);

      logger.info('Deployment initiated successfully', {
        websiteId,
        deploymentId: deployment.id,
        url: deployment.url
      });

      return {
        deploymentUrl: deployment.url,
        vercelDeploymentId: deployment.id
      };

    } catch (error) {
      logger.error('Deployment initiation failed', {
        websiteId,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Deployment failed: ${error.message}`);
    }
  }

  /**
   * Get website with template
   */
  async getWebsiteWithTemplate(websiteId) {
    const website = await Website.findByPk(websiteId, {
      include: [{
        model: WebsiteTemplate,
        attributes: ['framework', 'websiteTemplateId', 'name']
      }]
    });

    if (!website) {
      throw new Error('Website not found');
    }

    if (!website.WebsiteTemplate) {
      throw new Error('Website template not found');
    }

    return website;
  }

  /**
   * Generate deployment name
   */
  generateDeploymentName(website) {
    const baseName = website.name 
      ? website.name.toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
          .substring(0, 40)
      : `website-${website.id.slice(0, 8)}`;
    
    return `${baseName}-${Date.now().toString(36)}`;
  }

  /**
   * Build deployment configuration
   */
  buildDeploymentConfig(website) {
    const template = website.WebsiteTemplate;
    const templateConfig = TEMPLATE_DEPLOYMENT_MAP[Number(template.websiteTemplateId)];
    if (!templateConfig) throw new Error(`Unsupported storefront template: ${template.websiteTemplateId}`);
    if (!process.env.VERCEL_GIT_REPOSITORY_ID) {
      throw new Error('VERCEL_GIT_REPOSITORY_ID must identify the rentify-client repository');
    }
    
    return {
      name: this.generateDeploymentName(website),
      gitSource: {
        type: 'github',
        repo: process.env.VERCEL_GIT_REPOSITORY || 'Thna17/rentify-client',
        repoId: process.env.VERCEL_GIT_REPOSITORY_ID,
        ref: 'main',
      },
      projectSettings: {
        framework: template.framework,
        installCommand: 'npm ci --ignore-scripts',
        buildCommand: `npx vite build --config ${templateConfig.config}`,
        outputDirectory: templateConfig.output,
        nodeVersion: '18.x',
      },
      env: {
        NX_DAEMON: 'false',
        NODE_OPTIONS: '--openssl-legacy-provider',
        WEBSITE_ID: website.id,
        TEMPLATE_ID: template.websiteTemplateId.toString(),
        VITE_RENTIFY_API_URL: runtimeUrls.rentifyApiUrl,
        VITE_ECOMMERCE_API_URL: runtimeUrls.ecommerceApiUrl,
        VITE_AUTH_URL: runtimeUrls.authUrl,
        VITE_MERCHANT_DASHBOARD_URL: runtimeUrls.merchantDashboardUrl,
        VITE_MARKETING_URL: runtimeUrls.marketingUrl,
        VITE_STOREFRONT_ORIGIN: runtimeUrls.storefrontOrigin,
      },
      target: 'production',
      public: true,
    };
  }

  /**
   * Get build command for template
   */
  getBuildCommand(template) {
    return `nx build ecommerce-template-${template.websiteTemplateId}`;
  }

  /**
   * Get output directory for template
   */
  getOutputDirectory(template) {
    const isNextJS = template.framework === 'nextjs';
    const basePath = `dist/apps/templates/ecommerce/ecommerce-template-${template.websiteTemplateId}`;
    return isNextJS ? `${basePath}/.next` : basePath;
  }

  /**
   * Check deployment status
   */
  async getDeploymentStatus(deploymentId) {
    try {
      const status = await this.vercel.getDeploymentStatus(deploymentId);
      logger.debug('Deployment status checked', { deploymentId, status });
      return status;
    } catch (error) {
      logger.error('Deployment status check failed', { deploymentId, error: error.message });
      throw new Error(`Status check failed: ${error.message}`);
    }
  }
}

module.exports = new DeploymentService();
