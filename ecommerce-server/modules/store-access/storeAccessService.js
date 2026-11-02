const { Op } = require('sequelize');
const { sequelize } = require('../../config/db');
const { receiveEvent } = require('../events');
const {
  StoreAccess, StoreDeliveryPolicy, WebsiteData, Product, Category, Cart, Order, Invoice,
  Payment, UsageEvent, BillingStatement, PaymentGatewayConfig, Customer,
} = require('../../models');

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const approvals = new Set(['pending', 'approved', 'needs_changes', 'rejected', 'suspended']);
const statuses = new Set(['active', 'suspended', 'closed']);

function validateSnapshot(snapshot) {
  if (!snapshot || !uuid.test(snapshot.storeId) || !uuid.test(snapshot.ownerUserId) ||
      (snapshot.websiteId !== null && snapshot.websiteId !== undefined && !uuid.test(snapshot.websiteId)) ||
      !Number.isSafeInteger(snapshot.version) || snapshot.version < 1 ||
      typeof snapshot.marketplaceEnabled !== 'boolean' ||
      !['pilot', 'none'].includes(snapshot.marketplaceEntitlement) ||
      !approvals.has(snapshot.marketplaceApprovalStatus) || !statuses.has(snapshot.status)) {
    const error = new Error('Invalid Store projection');
    error.statusCode = 400;
    throw error;
  }
}

const websiteScopedModels = [
  WebsiteData, Product, Category, Cart, Order, Invoice,
  UsageEvent, BillingStatement, PaymentGatewayConfig,
];

async function backfillWebsiteRows(storeId, websiteId, transaction) {
  if (!websiteId) return;
  for (const model of websiteScopedModels) {
    const conflicting = await model.count({
      where: { websiteId, storeId: { [Op.notIn]: [storeId] } },
      transaction,
    });
    if (conflicting) throw new Error(`Conflicting Store mapping in ${model.getTableName()}`);
    await model.update({ storeId }, { where: { websiteId, storeId: null }, transaction });
  }

  // Payments inherit their Store through the Order; they have no websiteId.
  await sequelize.query(`
    UPDATE Payments p JOIN Orders o ON o.id = p.orderId
    SET p.storeId = ?
    WHERE o.websiteId = ? AND p.storeId IS NULL
  `, { replacements: [storeId, websiteId], transaction });
  const [paymentConflicts] = await sequelize.query(`
    SELECT p.id FROM Payments p JOIN Orders o ON o.id = p.orderId
    WHERE o.websiteId = ? AND p.storeId <> ? LIMIT 1
  `, { replacements: [websiteId, storeId], transaction });
  if (paymentConflicts.length) throw new Error('Conflicting Store mapping in Payments');

  // Customer.storeId currently means Website ID in the old auth contract.
  // Leave it intact until buyer identity cutover.
  await Customer.update({ tenantStoreId: storeId }, {
    where: { storeId: websiteId, tenantStoreId: null }, transaction,
  });
  const customerConflicts = await Customer.count({
    where: { storeId: websiteId, tenantStoreId: { [Op.notIn]: [storeId] } }, transaction,
  });
  if (customerConflicts) throw new Error('Conflicting Store mapping in Customers');
}

async function applySnapshot(snapshot) {
  validateSnapshot(snapshot);
  return sequelize.transaction(async (transaction) => {
    const existing = await StoreAccess.findByPk(snapshot.storeId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (existing && existing.version > snapshot.version) {
      return { applied: false, version: existing.version };
    }
    if (existing && existing.version === snapshot.version) {
      return { applied: false, version: existing.version };
    }
    const data = {
      storeId: snapshot.storeId,
      ownerUserId: snapshot.ownerUserId,
      websiteId: snapshot.websiteId || null,
      primaryCategory: snapshot.primaryCategory || null,
      needsCategoryReview: Boolean(snapshot.needsCategoryReview),
      marketplaceEnabled: snapshot.marketplaceEnabled,
      marketplaceApprovalStatus: snapshot.marketplaceApprovalStatus,
      status: snapshot.status,
      version: snapshot.version,
      marketplaceEntitlement: snapshot.marketplaceEntitlement,
      entitlements: snapshot.entitlements || existing?.entitlements || null,
      entitlementVersion: snapshot.entitlementVersion || snapshot.entitlements?.version || 1,
    };
    if (existing) await existing.update(data, { transaction });
    else await StoreAccess.create(data, { transaction });
    const policy = await StoreDeliveryPolicy.findByPk(snapshot.storeId, { transaction });
    if (!policy) {
      await StoreDeliveryPolicy.create({
        storeId: snapshot.storeId,
        flatFee: '2.00',
        currency: 'USD',
        version: 1,
      }, { transaction });
    }
    await backfillWebsiteRows(snapshot.storeId, snapshot.websiteId, transaction);
    return { applied: true, version: snapshot.version };
  });
}

function getStoreEntitlements(store) {
  if (store?.entitlements && typeof store.entitlements === 'object') {
    return store.entitlements;
  }
  // Safe deterministic fallback when snapshot lacks explicit entitlements object
  const isSuspended = store?.status === 'suspended';
  const isPilot = store?.marketplaceEntitlement === 'pilot';
  const hasWebsite = Boolean(store?.websiteId);

  return {
    version: store?.entitlementVersion || 1,
    tier: isPilot ? 'free_pilot' : (hasWebsite ? 'starter' : 'free_pilot'),
    displayName: isPilot ? 'Free' : (hasWebsite ? 'Starter' : 'Free'),
    lifecycleState: isSuspended ? 'suspended' : 'active',
    isTrial: false,
    isActive: !isSuspended,
    isGracePeriod: false,
    isSuspended,
    isCancelled: false,
    mutationsAllowed: !isSuspended,
    capabilities: {
      marketplaceListing: !isSuspended && Boolean(store?.marketplaceEnabled ?? true),
      website: true,
      productLimit: isPilot ? 25 : (hasWebsite ? 100 : 25),
      staffLimit: isPilot ? 1 : 2,
      pos: !isSuspended,
      invoices: !isSuspended,
      customDomainBrowse: false,
      hostedCheckout: !isSuspended,
      historicalOrderRead: true,
    },
    dates: {
      gracePeriodEndsAt: null,
      historicalAccessEndsAt: null,
    },
    restrictionReason: isSuspended ? 'Store is suspended' : null,
  };
}

async function applyStoreProjectedEvent(envelope) {
  return receiveEvent({
    envelope,
    consumer: 'store-access-projection',
    getCurrentAggregateVersion: async (_aggregateType, aggregateId) => {
      const store = await StoreAccess.findByPk(aggregateId);
      return store ? store.version : null;
    },
    handler: async (env) => {
      return applySnapshot(env.payload);
    },
  });
}

module.exports = {
  applySnapshot,
  validateSnapshot,
  backfillWebsiteRows,
  getStoreEntitlements,
  applyStoreProjectedEvent,
};
