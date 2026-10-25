// ecommerce-server/migrations/20261025_022_product_moderation_status.js
// Migration 022: P3-CAT-002 Product Publication and Visibility Explanation.
// Adds moderationStatus to Products and indexes for fail-closed catalog queries.

const { DataTypes } = require('sequelize');

exports.up = async (contextOrQueryInterface, maybeSequelize) => {
  const queryInterface = contextOrQueryInterface.queryInterface || contextOrQueryInterface;
  const sequelize = contextOrQueryInterface.sequelize || maybeSequelize || queryInterface.sequelize;

  // 1. Add moderationStatus column to Products idempotently
  const productTableDesc = await queryInterface.describeTable('Products').catch(() => ({}));
  if (!productTableDesc.moderationStatus) {
    await queryInterface.addColumn('Products', 'moderationStatus', {
      type: DataTypes.STRING(32),
      defaultValue: 'approved',
      allowNull: false,
      comment: 'P3-CAT-002: Content moderation status (approved, pending, flagged, rejected)',
    });
  }

  // 2. Add indexes on Products idempotently
  const existingProductIndexes = await queryInterface.showIndex('Products').catch(() => []);
  const productIndexNames = new Set(existingProductIndexes.map((idx) => idx.name));

  if (!productIndexNames.has('idx_products_moderation_status')) {
    try {
      await queryInterface.addIndex('Products', ['moderationStatus'], {
        name: 'idx_products_moderation_status',
      });
    } catch (_err) {
      // Index may already exist
    }
  }

  if (!productIndexNames.has('idx_products_store_moderation')) {
    try {
      await queryInterface.addIndex('Products', ['storeId', 'moderationStatus'], {
        name: 'idx_products_store_moderation',
      });
    } catch (_err) {
      // Index may already exist
    }
  }

  if (!productIndexNames.has('idx_products_mkt_cat_mod_status')) {
    try {
      await queryInterface.addIndex('Products', ['marketplaceCategory', 'status', 'moderationStatus'], {
        name: 'idx_products_mkt_cat_mod_status',
      });
    } catch (_err) {
      // Index may already exist
    }
  }
};

exports.down = async (contextOrQueryInterface) => {
  const queryInterface = contextOrQueryInterface.queryInterface || contextOrQueryInterface;

  const productTableDesc = await queryInterface.describeTable('Products').catch(() => ({}));
  if (productTableDesc.moderationStatus) {
    await queryInterface.removeColumn('Products', 'moderationStatus').catch(() => {});
  }
};
