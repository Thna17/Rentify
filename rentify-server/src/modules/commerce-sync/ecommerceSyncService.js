const axios = require('axios');
const { logger, getCorrelationId, runWithCorrelation } = require('../../utils/logger');
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

    this.apiClient.interceptors.request.use((config) => {
      const correlationId = getCorrelationId();
      if (correlationId && !config.headers?.['x-correlation-id']) {
        config.headers = config.headers || {};
        config.headers['x-correlation-id'] = correlationId;
      }
      return config;
    });
  }

  /**
   * Record a website projection for Commerce in the outbox. Pass the caller's
   * transaction so the outbox row commits or rolls back with the website.
   */
  async enqueueWebsiteSync(websiteId, payload, { transaction } = {}) {
    const correlationId = payload?._correlationId || getCorrelationId();
    const enriched = correlationId ? { ...payload, _correlationId: correlationId } : payload;
    return WebsiteSyncOutbox.create({ websiteId, payload: enriched }, { transaction });
  }

  /**
   * Sync website data to ecommerce service
   */
  async syncWebsiteData(website, { transaction } = {}) {
    if (!website._ecommerceData) {
      logger.warn('No ecommerce data found for website', { websiteId: website.id });
      return;
    }

    const correlationId = website._ecommerceData._correlationId || getCorrelationId();
    const execute = async () => {
      try {
        const { _correlationId, _syncType, ...cleanData } = website._ecommerceData;
        if (website._ecommerceData._syncType === 'template') {
          await this.apiClient.put(`/api/website-data/${website.id}`, { websiteTemplateId: cleanData.websiteTemplateId });
        } else if (website._ecommerceData._syncType === 'status') {
          await this.apiClient.put(`/api/website-data/${website.id}`, {
            status: toCommerceStatus(cleanData.status),
            ...(cleanData.domain && { domain: cleanData.domain }),
            ...(cleanData.websiteTemplateId !== undefined && { websiteTemplateId: cleanData.websiteTemplateId }),
          });
        } else {
          await this.apiClient.post('/api/website-data', {
            ...cleanData,
            status: toCommerceStatus(cleanData.status),
          });
        }
        await WebsiteSyncOutbox.update({
          status: 'synced',
          lastError: null,
          syncedAt: new Date(),
        }, { where: { websiteId: website.id }, transaction });
        logger.info('Website data synced to ecommerce service', { websiteId: website.id, correlationId });
        return true;
      } catch (error) {
        await WebsiteSyncOutbox.increment('attempts', { where: { websiteId: website.id }, transaction });
        await WebsiteSyncOutbox.update({
          lastError: String(error.message).slice(0, 500),
        }, { where: { websiteId: website.id }, transaction });
        logger.error('Ecommerce sync failed', {
          websiteId: website.id,
          correlationId,
          error: error.message,
          response: error.response?.data
        });
        // The pending outbox row is retried by the background worker.
        return false;
      }
    };

    if (correlationId && !getCorrelationId()) {
      return runWithCorrelation(correlationId, execute);
    }
    return execute();
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
      await this.retryWebsiteSync(item.websiteId);
    }
  }

  async queueWebsiteTemplate(websiteId, websiteTemplateId, { transaction } = {}) {
    const outbox = await WebsiteSyncOutbox.findByPk(websiteId, { transaction, lock: transaction?.LOCK.UPDATE });
    let payload;
    if (outbox?.payload && outbox.status === 'pending') {
      payload = { ...outbox.payload, websiteTemplateId };
    } else {
      payload = { _syncType: 'template', websiteTemplateId };
    }
    if (outbox) await outbox.update({ payload, status: 'pending', syncedAt: null }, { transaction });
    else await WebsiteSyncOutbox.create({ websiteId, payload, status: 'pending' }, { transaction });
  }

  async retryWebsiteSync(websiteId) {
    // Hold the row lock through delivery: a concurrent writer or worker must
    // wait, then read the current payload. An old response cannot mark a newer
    // version synced or overwrite a newer projection at Commerce.
    return WebsiteSyncOutbox.sequelize.transaction(async (transaction) => {
      const outbox = await WebsiteSyncOutbox.findByPk(websiteId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!outbox || outbox.status !== 'pending') return true;
      return this.syncWebsiteData({ id: websiteId, _ecommerceData: outbox.payload }, { transaction });
    });
  }

  /**
   * Update website status in ecommerce service
   */
  async updateWebsiteStatus(websiteId, status, domain = null) {
    await WebsiteSyncOutbox.sequelize.transaction(async (transaction) => {
      const outbox = await WebsiteSyncOutbox.findByPk(websiteId, { transaction, lock: transaction.LOCK.UPDATE });
      const current = outbox?.status === 'pending' ? outbox.payload : { _syncType: 'status' };
      const payload = { ...current, ...(current._syncType === 'template' && { _syncType: 'status' }),
        status, ...(domain && { domain }) };
      if (outbox) await outbox.update({ payload, status: 'pending', syncedAt: null }, { transaction });
      else await WebsiteSyncOutbox.create({ websiteId, payload, status: 'pending' }, { transaction });
    });
    const synced = await this.retryWebsiteSync(websiteId);
    if (!synced) throw new Error('Commerce status sync pending retry');
    logger.info('Website status updated in ecommerce service', { websiteId, status });
  }
}

module.exports = new EcommerceSyncService();
module.exports.toCommerceStatus = toCommerceStatus;
