const { Store, Website, User, SellerApplication, SellerReview } = require('../../models');
const storeSyncService = require('../commerce-sync/storeSyncService');

const fields = ['responsibleName', 'pickupLocation', 'buyerContact', 'sampleProductDescription'];
const commitments = [
  'acceptsDeliveryResponsibility', 'acceptsCodResponsibility',
  'acceptsReturnsResponsibility', 'acceptsRefundResponsibility',
];
const checklistKeys = [
  'accountVerified', 'identityReviewed', 'storeDetailsReviewed',
  'sampleProductReviewed', 'fulfillmentReviewed', 'restrictedProductsReviewed',
];

function invalid(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function validateApplication(input) {
  const data = {};
  for (const field of fields) {
    const value = typeof input[field] === 'string' ? input[field].trim() : '';
    if (!value || value.length > (field === 'pickupLocation' ? 255 : field === 'sampleProductDescription' ? 500 : 120)) {
      throw invalid(`${field} is required and must fit the allowed length`);
    }
    data[field] = value;
  }
  for (const field of commitments) {
    if (input[field] !== true) throw invalid(`${field} must be accepted`);
    data[field] = true;
  }
  return data;
}

async function submit(ownerUserId, input) {
  const data = validateApplication(input || {});
  return Store.sequelize.transaction(async (transaction) => {
    const store = await Store.findOne({
      where: { ownerUserId }, transaction, lock: transaction.LOCK.UPDATE,
    });
    if (!store) throw invalid('Store not found', 404);
    if (store.status !== 'active') throw invalid('Store is not active', 403);
    if (store.marketplaceApprovalStatus === 'suspended') {
      throw invalid('Seller is suspended; contact support', 403);
    }
    if (store.needsCategoryReview || !store.primaryCategory) {
      throw invalid('Choose a primary category before applying');
    }
    const existing = await SellerApplication.findByPk(store.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (existing?.status === 'approved' || store.marketplaceApprovalStatus === 'approved') {
      throw invalid('Seller is already approved', 409);
    }
    if (existing?.status === 'pending') return existing;
    const values = { ...data, status: 'pending', reviewReason: null, submittedAt: new Date(), reviewedAt: null };
    const application = existing
      ? await existing.update(values, { transaction })
      : await SellerApplication.create({ storeId: store.id, ...values }, { transaction });
    await store.update({
      marketplaceApprovalStatus: 'pending', projectionVersion: store.projectionVersion + 1,
    }, { transaction });
    const website = await Website.findOne({ where: { storeId: store.id }, attributes: ['id'], transaction });
    await storeSyncService.queueStore(store, { websiteId: website?.id || null, transaction });
    return application;
  });
}

async function review({ storeId, reviewerUserId, decision, checklist, reason }) {
  if (!['approved', 'needs_changes', 'rejected', 'suspended'].includes(decision)) {
    throw invalid('Invalid review decision');
  }
  if (!checklist || checklistKeys.some((key) => typeof checklist[key] !== 'boolean')) {
    throw invalid(`Checklist requires ${checklistKeys.join(', ')}`);
  }
  const reviewReason = typeof reason === 'string' ? reason.trim().slice(0, 500) : '';
  if (decision !== 'approved' && !reviewReason) throw invalid('A reason is required');
  if (decision === 'approved' && checklistKeys.some((key) => checklist[key] !== true)) {
    throw invalid('Every approval check must pass');
  }
  return Store.sequelize.transaction(async (transaction) => {
    const store = await Store.findByPk(storeId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!store) throw invalid('Store not found', 404);
    let application = await SellerApplication.findByPk(storeId, { transaction, lock: transaction.LOCK.UPDATE });
    if (decision === 'approved') {
      const owner = await User.findByPk(store.ownerUserId, { transaction });
      if (!owner?.isVerified || !(owner.email || owner.phoneNumber)) {
        throw invalid('Merchant account contact is not verified');
      }
      if (store.needsCategoryReview || !store.primaryCategory) throw invalid('Store category needs review');
    }
    if (!application) {
      const owner = await User.findByPk(store.ownerUserId, { transaction });
      application = await SellerApplication.create({
        storeId,
        responsibleName: owner?.name || store.name,
        pickupLocation: 'Store location pending',
        buyerContact: owner?.email || owner?.phoneNumber || 'Pending contact',
        sampleProductDescription: 'Store listing reviewed by administrator',
        acceptsDeliveryResponsibility: true,
        acceptsCodResponsibility: true,
        acceptsReturnsResponsibility: true,
        acceptsRefundResponsibility: true,
        status: decision === 'suspended' ? 'rejected' : decision,
        reviewReason: reviewReason || null,
        submittedAt: new Date(),
        reviewedAt: new Date(),
      }, { transaction });
    } else {
      await application.update({
        status: decision === 'suspended' ? 'rejected' : decision,
        reviewReason: reviewReason || null,
        reviewedAt: new Date(),
      }, { transaction });
    }
    const audit = await SellerReview.create({
      storeId, reviewerUserId, decision, checklist, reason: reviewReason || null,
    }, { transaction });
    await store.update({
      marketplaceApprovalStatus: decision,
      projectionVersion: store.projectionVersion + 1,
    }, { transaction });
    const website = await Website.findOne({ where: { storeId }, attributes: ['id'], transaction });
    await storeSyncService.queueStore(store, { websiteId: website?.id || null, transaction });
    return { application, audit, store };
  });
}

module.exports = { submit, review, checklistKeys, validateApplication };
