const axios = require('axios');
const { Op } = require('sequelize');
const { StoreSyncOutbox } = require('../../models');
const { ecommerceApiUrl } = require('../../config/runtimeUrls');
const { logger } = require('../../utils/logger');

const apiClient = axios.create({
  baseURL: ecommerceApiUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'x-rentify-service-token': process.env.SERVICE_TO_SERVICE_TOKEN,
  },
});

const snapshot = (store, websiteId = null) => ({
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
});

async function queueStore(store, { websiteId = null, transaction } = {}) {
  const payload = snapshot(store, websiteId);
  const existing = await StoreSyncOutbox.findByPk(store.id, { transaction });
  if (existing) {
    await existing.update({ payload, version: payload.version, status: 'pending', syncedAt: null }, { transaction });
  } else {
    await StoreSyncOutbox.create({ storeId: store.id, payload, version: payload.version }, { transaction });
  }
  return payload;
}

async function syncStore(storeId) {
  const item = await StoreSyncOutbox.findByPk(storeId);
  if (!item || item.status !== 'pending') return true;
  try {
    await apiClient.post('/api/store-access/sync', item.payload);
    // A newer version may have entered the outbox during this HTTP call.
    await StoreSyncOutbox.update({
      status: 'synced', lastError: null, syncedAt: new Date(),
    }, { where: { storeId, status: 'pending', version: item.version } });
    return true;
  } catch (error) {
    await StoreSyncOutbox.increment('attempts', { where: { storeId } });
    await StoreSyncOutbox.update({ lastError: String(error.message).slice(0, 500) }, { where: { storeId } });
    logger.error('Store projection sync failed', { storeId, error: error.message });
    return false;
  }
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
