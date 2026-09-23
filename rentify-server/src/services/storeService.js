const { randomUUID } = require('node:crypto');
const { Store, User } = require('../models');

const clean = (value, maxLength) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

class StoreService {
  async getOwnStore(ownerUserId) {
    return Store.findOne({ where: { ownerUserId } });
  }

  async createMarketplaceStore({ ownerUserId, name, primaryCategory, marketplaceEnabled = true }) {
    const storeName = clean(name, 120);
    const category = clean(primaryCategory, 120);
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
        return this.createForOwner({
          ownerUserId, name: storeName, primaryCategory: category,
          marketplaceEnabled, transaction,
        });
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
    const category = clean(primaryCategory, 120);
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
    const existing = await Store.findOne({ where: { ownerUserId }, transaction });
    if (existing) return existing;
    return this.createForOwner({
      ownerUserId,
      name: businessData?.name,
      primaryCategory: businessData?.primaryCategory,
      transaction,
    });
  }

  async updateOwnStore({ ownerUserId, primaryCategory, marketplaceEnabled }) {
    const store = await this.getOwnStore(ownerUserId);
    if (!store) {
      const error = new Error('Store not found');
      error.statusCode = 404;
      throw error;
    }
    const changes = {};
    if (primaryCategory !== undefined) {
      const category = clean(primaryCategory, 120);
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
    if (Object.keys(changes).length) await store.update(changes);
    return store;
  }
}

module.exports = new StoreService();
