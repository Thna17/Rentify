const { randomUUID } = require('node:crypto');
const { Op } = require('sequelize');
const { Store, User } = require('../models');
const storeSyncService = require('./storeSyncService');
const { normalizeStoreCategory } = require('../config/storeCategories');

const clean = (value, maxLength) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

class StoreService {
  publicStoreWhere = {
    status: 'active', marketplaceApprovalStatus: 'approved',
    marketplaceEntitlement: 'pilot', needsCategoryReview: false,
  };

  publicStoreAttributes = ['id', 'name', 'slug', 'primaryCategory'];

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

  async getOwnStore(ownerUserId) {
    return Store.findOne({ where: { ownerUserId } });
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
    return Store.create({
      id,
      ownerUserId,
      name: clean(name, 120) || 'Store',
      slug: `store-${id}`,
      primaryCategory: category || null,
      needsCategoryReview: !category,
      marketplaceEnabled,
      marketplaceApprovalStatus: 'pending',
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
      if (category && (existing.primaryCategory !== category || existing.needsCategoryReview)) {
        await existing.update({
          primaryCategory: category, needsCategoryReview: false,
          projectionVersion: existing.projectionVersion + 1,
        }, { transaction });
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
