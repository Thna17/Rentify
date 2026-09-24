const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const {
  StoreAccess, WebsiteData, Product, Category, Cart, Order, Invoice,
  Payment, UsageEvent, BillingStatement, PaymentGatewayConfig, Customer,
} = require('../models');

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
    };
    if (existing) await existing.update(data, { transaction });
    else await StoreAccess.create(data, { transaction });
    await backfillWebsiteRows(snapshot.storeId, snapshot.websiteId, transaction);
    return { applied: true, version: snapshot.version };
  });
}

module.exports = { applySnapshot, validateSnapshot, backfillWebsiteRows };
