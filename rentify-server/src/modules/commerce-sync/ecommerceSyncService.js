// services/ecommerceSyncService.js
const axios = require('axios');
const { logger } = require('../../utils/logger');
const { ecommerceApiUrl } = require('../../config/runtimeUrls');
const { WebsiteSyncOutbox } = require('../../models');
const { Op } = require('sequelize');

// Core tracks deployment stages; Commerce only tracks whether a website can
// operate. Never send a Core-only enum value to Commerce's WebsiteData model.
const commerceStatusByCoreStatus = Object.freeze({
  customization: 'inactive',
  pending: 'inactive',
  building: 'inactive',
  active: 'active',
  failed: 'inactive',
  suspended: 'suspended',
  expired: 'inactive',
  archived: 'inactive',
  deleted: 'inactive',
});

const toCommerceStatus = (status) => {
  const mapped = commerceStatusByCoreStatus[status];
  if (!mapped) throw new Error(`Unsupported Core website status: ${status}`);
  return mapped;
};

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
      if (website._ecommerceData._syncType === 'status') {
        await this.apiClient.put(`/api/website-data/${website.id}`, {
          status: toCommerceStatus(website._ecommerceData.status),
          ...(website._ecommerceData.domain && { domain: website._ecommerceData.domain }),
        });
      } else {
        await this.apiClient.post('/api/website-data', {
          ...website._ecommerceData,
          status: toCommerceStatus(website._ecommerceData.status),
        });
      }
      await WebsiteSyncOutbox.update({
        status: 'synced',
        lastError: null,
        syncedAt: new Date(),
      }, { where: { websiteId: website.id } });
      logger.info('Website data synced to ecommerce service', { websiteId: website.id });
      return true;
    } catch (error) {
      await WebsiteSyncOutbox.increment('attempts', { where: { websiteId: website.id } });
      await WebsiteSyncOutbox.update({
        lastError: String(error.message).slice(0, 500),
      }, { where: { websiteId: website.id } });
      logger.error('Ecommerce sync failed', {
        websiteId: website.id,
        error: error.message,
        response: error.response?.data
      });
      // The pending outbox row is retried by the background worker.
      return false;
    }
  }

  async retryPendingWebsiteData() {
    const pending = await WebsiteSyncOutbox.findAll({
      where: {
        status: 'pending',
        updatedAt: { [Op.lt]: new Date(Date.now() - 30_000) },
      },
      order: [['createdAt', 'ASC']],
      limit: 50,
    });
    for (const item of pending) {
      await this.syncWebsiteData({ id: item.websiteId, _ecommerceData: item.payload });
    }
  }

  /**
   * Update website status in ecommerce service
   */
  async updateWebsiteStatus(websiteId, status, domain = null) {
    let outbox = await WebsiteSyncOutbox.findByPk(websiteId);
    if (outbox) {
      await outbox.update({
        payload: {
          ...outbox.payload,
          status,
          ...(domain && { domain }),
        },
        status: 'pending',
        syncedAt: null,
      });
    } else {
      // Older Websites predate the initial-sync outbox. Their Commerce row
      // already exists, so persist a status-only PUT for retry.
      outbox = await WebsiteSyncOutbox.create({
        websiteId,
        payload: { _syncType: 'status', status, ...(domain && { domain }) },
        status: 'pending',
      });
    }
    const synced = await this.syncWebsiteData({ id: websiteId, _ecommerceData: outbox.payload });
    if (!synced) throw new Error('Commerce status sync pending retry');
    logger.info('Website status updated in ecommerce service', { websiteId, status });
  }
}

module.exports = new EcommerceSyncService();
module.exports.toCommerceStatus = toCommerceStatus;
