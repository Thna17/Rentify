// services/ecommerceSyncService.js
const axios = require('axios');
const { logger } = require('../utils/logger');
const { ecommerceApiUrl } = require('../config/runtimeUrls');

class EcommerceSyncService {
  constructor() {
    this.apiClient = axios.create({
      baseURL: ecommerceApiUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'x-rentify-service-token': process.env.SERVICE_TO_SERVICE_TOKEN,
      }
    });
  }

  /**
   * Sync website data to ecommerce service
   */
  async syncWebsiteData(website) {
    if (!website._ecommerceData) {
      logger.warn('No ecommerce data found for website', { websiteId: website.id });
      return;
    }

    try {
      await this.apiClient.post('/api/website-data', website._ecommerceData);
      logger.info('Website data synced to ecommerce service', { websiteId: website.id });
    } catch (error) {
      logger.error('Ecommerce sync failed', {
        websiteId: website.id,
        error: error.message,
        response: error.response?.data
      });
      // Don't throw error - this shouldn't block website creation
    }
  }

  /**
   * Update website status in ecommerce service
   */
  async updateWebsiteStatus(websiteId, status, domain = null) {
    try {
      await this.apiClient.put(`/api/website-data/${websiteId}`, {
        status,
        ...(domain && { domain })
      });
      logger.info('Website status updated in ecommerce service', { websiteId, status });
    } catch (error) {
      logger.error('Ecommerce status update failed', {
        websiteId,
        status,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = new EcommerceSyncService();
