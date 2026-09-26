const { randomUUID } = require('node:crypto');
const { Op } = require('sequelize');
const { Store, User, Staff, Website } = require('../models');
const storeSyncService = require('./storeSyncService');
const { normalizeStoreCategory } = require('../config/storeCategories');

const clean = (value, maxLength) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

const developmentApprovalEnabled = () => process.env.NODE_ENV === 'development' &&
  process.env.DEV_MARKETPLACE_AUTO_APPROVAL === 'true';

const eligibleForDevelopmentApproval = (store, owner) =>
  developmentApprovalEnabled() && store.status === 'active' &&
  store.marketplaceApprovalStatus === 'pending' &&
  !store.needsCategoryReview && Boolean(normalizeStoreCategory(store.primaryCategory)) &&
  owner?.isVerified === true && Boolean(owner.email || owner.phoneNumber);

const approvalCandidate = (store, changes = {}) => ({
  status: store.status, marketplaceApprovalStatus: store.marketplaceApprovalStatus,
  primaryCategory: changes.primaryCategory ?? store.primaryCategory,
  needsCategoryReview: changes.needsCategoryReview ?? store.needsCategoryReview,
});

class StoreService {
  publicStoreWhere = {
    status: 'active', marketplaceApprovalStatus: 'approved',
    marketplaceEntitlement: 'pilot', needsCategoryReview: false,
  };

  publicStoreAttributes = ['id', 'name', 'slug', 'primaryCategory', 'logoUrl'];

  async listPublicStores(ids) {
    if (typeof ids !== 'string' || !ids.trim()) return [];
    const unique = [...new Set(ids.split(',').map((id) => id.trim()))];
    if (unique.length > 60 || unique.some((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) {
      const error = new Error('Supply up to 60 Store IDs');
      error.statusCode = 400;
      throw error;
    }
    return Store.findAll({
      where: { ...this.publicStoreWhere, id: { [Op.in]: unique } },
      attributes: this.publicStoreAttributes,
    });
  }

  async getPublicStore(storeId) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeId)) return null;
    return Store.findOne({ where: { ...this.publicStoreWhere, id: storeId },
      attributes: this.publicStoreAttributes });
  }

  async getOwnStore(userId) {
    const store = await Store.findOne({ where: { ownerUserId: userId } });
    if (store) return store;

    // Check if user is staff belonging to a website or merchant
    const staff = await Staff.findByPk(userId);
    if (staff) {
      if (staff.websiteId) {
        const website = await Website.findByPk(staff.websiteId);
        if (website?.storeId) {
          const websiteStore = await Store.findByPk(website.storeId);
          if (websiteStore) return websiteStore;
        }
      }
      if (staff.merchantId) {
        const merchantStore = await Store.findOne({ where: { ownerUserId: staff.merchantId } });
        if (merchantStore) return merchantStore;
      }
    }
    return null;
  }

  async createMarketplaceStore({ ownerUserId, name, primaryCategory, marketplaceEnabled = true }) {
    const storeName = clean(name, 120);
    const category = normalizeStoreCategory(primaryCategory);
    if (!storeName || !category || typeof marketplaceEnabled !== 'boolean') {
      const error = new Error('Store name, primary category, and a boolean marketplace setting are required');
      error.statusCode = 400;
      throw error;
    }

    const existing = await this.getOwnStore(ownerUserId);
    if (existing) return { store: existing, created: false };

    try {
      const store = await Store.sequelize.transaction(async (transaction) => {
        const owner = await User.findByPk(ownerUserId, { transaction });
        if (!owner) {
          const error = new Error('Merchant account not found');
          error.statusCode = 404;
          throw error;
        }
        const created = await this.createForOwner({
          ownerUserId, name: storeName, primaryCategory: category,
          marketplaceEnabled, transaction,
        });
        await storeSyncService.queueStore(created, { transaction });
        return created;
      });
      return { store, created: true };
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        const store = await this.getOwnStore(ownerUserId);
        if (store) return { store, created: false };
      }
      throw error;
    }
  }

  async createForOwner({ ownerUserId, name, primaryCategory, marketplaceEnabled = true, transaction }) {
    const id = randomUUID();
    const category = normalizeStoreCategory(primaryCategory);
    const owner = developmentApprovalEnabled()
      ? await User.findByPk(ownerUserId, { transaction }) : null;
    const approval = eligibleForDevelopmentApproval({
      status: 'active', marketplaceApprovalStatus: 'pending',
      primaryCategory: category, needsCategoryReview: !category,
    }, owner) ? 'approved' : 'pending';
    return Store.create({
      id,
      ownerUserId,
      name: clean(name, 120) || 'Store',
      slug: `store-${id}`,
      primaryCategory: category || null,
      needsCategoryReview: !category,
      marketplaceEnabled,
      marketplaceApprovalStatus: approval,
      status: 'active',
    }, { transaction });
  }

  async ensureForWebsite({ ownerUserId, businessData, transaction }) {
    const category = normalizeStoreCategory(businessData?.primaryCategory);
    if (!category) {
      const error = new Error('Choose a valid primary Store category');
      error.statusCode = 400;
      throw error;
    }
    const existing = await Store.findOne({ where: { ownerUserId }, transaction });
    if (existing) {
      const changes = {};
      if (existing.primaryCategory !== category || existing.needsCategoryReview) {
        changes.primaryCategory = category;
        changes.needsCategoryReview = false;
      }
      const owner = developmentApprovalEnabled()
        ? await User.findByPk(ownerUserId, { transaction }) : null;
      if (eligibleForDevelopmentApproval(approvalCandidate(existing, changes), owner)) {
        changes.marketplaceApprovalStatus = 'approved';
      }
      if (Object.keys(changes).length) {
        await existing.update({ ...changes, projectionVersion: existing.projectionVersion + 1 }, { transaction });
      }
      return existing;
    }
    return this.createForOwner({
      ownerUserId,
      name: businessData?.name,
      primaryCategory: category,
      transaction,
    });
  }

  async updateOwnStore({ ownerUserId, primaryCategory, marketplaceEnabled }) {
    const changes = {};
    if (primaryCategory !== undefined) {
      const category = normalizeStoreCategory(primaryCategory);
      if (!category) {
        const error = new Error('Primary category is required');
        error.statusCode = 400;
        throw error;
      }
      changes.primaryCategory = category;
      changes.needsCategoryReview = false;
    }
    if (marketplaceEnabled !== undefined) {
      if (typeof marketplaceEnabled !== 'boolean') {
        const error = new Error('Marketplace setting must be a boolean');
        error.statusCode = 400;
        throw error;
      }
      changes.marketplaceEnabled = marketplaceEnabled;
    }
    return Store.sequelize.transaction(async (transaction) => {
      const store = await Store.findOne({
        where: { ownerUserId }, transaction, lock: transaction.LOCK.UPDATE,
      });
      if (!store) {
        const error = new Error('Store not found');
        error.statusCode = 404;
        throw error;
      }
      const owner = developmentApprovalEnabled()
        ? await User.findByPk(ownerUserId, { transaction }) : null;
      if (eligibleForDevelopmentApproval(approvalCandidate(store, changes), owner)) {
        changes.marketplaceApprovalStatus = 'approved';
      }
      if (Object.keys(changes).length) {
        await store.update({ ...changes, projectionVersion: store.projectionVersion + 1 }, { transaction });
        const { Website } = require('../models');
        const website = await Website.findOne({ where: { storeId: store.id }, attributes: ['id'], transaction });
        await storeSyncService.queueStore(store, { websiteId: website?.id || null, transaction });
      }
      return store;
    });
  }
}

module.exports = new StoreService();
module.exports.developmentApprovalEnabled = developmentApprovalEnabled;
module.exports.eligibleForDevelopmentApproval = eligibleForDevelopmentApproval;
