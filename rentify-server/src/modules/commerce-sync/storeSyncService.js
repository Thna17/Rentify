const axios = require('axios');
const { Op } = require('sequelize');
const { StoreSyncOutbox } = require('../../models');
const { ecommerceApiUrl } = require('../../config/runtimeUrls');
const { logger, getCorrelationId, runWithCorrelation } = require('../../utils/logger');

const apiClient = axios.create({
  baseURL: ecommerceApiUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'x-rentify-service-token': process.env.SERVICE_TO_SERVICE_TOKEN,
  },
});

apiClient.interceptors.request.use((config) => {
  const correlationId = getCorrelationId();
  if (correlationId && !config.headers?.['x-correlation-id']) {
    config.headers = config.headers || {};
    config.headers['x-correlation-id'] = correlationId;
  }
  return config;
});

const snapshot = (store, websiteId = null, entitlements = null) => ({
  storeId: store.id,
  ownerUserId: store.ownerUserId,
  websiteId,
  primaryCategory: store.primaryCategory,
  needsCategoryReview: Boolean(store.needsCategoryReview),
  marketplaceEnabled: Boolean(store.marketplaceEnabled),
  marketplaceApprovalStatus: store.marketplaceApprovalStatus,
  status: store.status,
  marketplaceEntitlement: store.marketplaceEntitlement,
  version: store.projectionVersion,
  entitlements: entitlements || null,
  entitlementVersion: entitlements?.version || 1,
  _correlationId: getCorrelationId(),
});

async function queueStore(store, { websiteId = null, transaction, entitlements = null } = {}) {
  let storeEntitlements = entitlements;
  if (!storeEntitlements) {
    try {
      const { entitlementService } = require('../billing');
      storeEntitlements = await entitlementService.evaluateStoreEntitlements(store.id, {
        transaction,
        store,
        website: websiteId ? { id: websiteId, storeId: store.id } : undefined,
      });
    } catch {
      // Fallback in lightweight test fixtures
    }
  }
  const payload = snapshot(store, websiteId, storeEntitlements);
  const existing = await StoreSyncOutbox.findByPk(store.id, { transaction });
  if (existing) {
    await existing.update({ payload, version: payload.version, status: 'pending', syncedAt: null }, { transaction });
  } else {
    await StoreSyncOutbox.create({ storeId: store.id, payload, version: payload.version }, { transaction });
  }

  // P3-EVT-001: Record standard event in EventOutbox
  try {
    const { recordEvent } = require('../events');
    await recordEvent({
      eventType: 'store.projected.v1',
      aggregateType: 'Store',
      aggregateId: store.id,
      aggregateVersion: Number(payload.version) || 1,
      producer: 'rentify-server',
      storeId: store.id,
      payload,
    }, { transaction });
  } catch (eventErr) {
    logger.warn('Failed to record standard store.projected.v1 event', { storeId: store.id, error: eventErr.message });
  }

  return payload;
}

async function syncStore(storeId) {
  const item = await StoreSyncOutbox.findByPk(storeId);
  if (!item || item.status !== 'pending') return true;
  const correlationId = item.payload?._correlationId || getCorrelationId();
  const execute = async () => {
    try {
      const { _correlationId, ...payloadToSend } = item.payload;
      await apiClient.post('/api/store-access/sync', payloadToSend);
      // A newer version may have entered the outbox during this HTTP call.
      await StoreSyncOutbox.update({
        status: 'synced', lastError: null, syncedAt: new Date(),
      }, { where: { storeId, status: 'pending', version: item.version } });
      return true;
    } catch (error) {
      await StoreSyncOutbox.increment('attempts', { where: { storeId } });
      await StoreSyncOutbox.update({ lastError: String(error.message).slice(0, 500) }, { where: { storeId } });
      logger.error('Store projection sync failed', { storeId, correlationId, error: error.message });
      return false;
    }
  };

  if (correlationId && !getCorrelationId()) {
    return runWithCorrelation(correlationId, execute);
  }
  return execute();
}

async function retryPendingStores() {
  const pending = await StoreSyncOutbox.findAll({
    where: { status: 'pending', updatedAt: { [Op.lt]: new Date(Date.now() - 30_000) } },
    order: [['updatedAt', 'ASC']],
    limit: 50,
  });
  for (const item of pending) await syncStore(item.storeId);
}

module.exports = { queueStore, syncStore, retryPendingStores, snapshot, apiClient };
