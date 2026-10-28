// ecommerce-server/migrations/20261026_023_channel_safe_store_carts.js
// Migration 023: P3-CART-001 Channel-Safe Store Carts.
// Adds channel column to Carts and ensures channel-scoped store unique indexes.

const { DataTypes } = require('sequelize');

exports.up = async (contextOrQueryInterface, maybeSequelize) => {
  const queryInterface = contextOrQueryInterface.queryInterface || contextOrQueryInterface;
  const sequelize = contextOrQueryInterface.sequelize || maybeSequelize || queryInterface.sequelize;

  // 1. Add channel column to Carts idempotently
  const cartTableDesc = await queryInterface.describeTable('Carts').catch(() => ({}));
  if (!cartTableDesc.channel) {
    await queryInterface.addColumn('Carts', 'channel', {
      type: DataTypes.STRING(32),
      defaultValue: 'marketplace',
      allowNull: false,
      comment: 'P3-CART-001: Sales channel boundary (marketplace, storefront)',
    });
  }

  // 2. Backfill existing carts: storefront if websiteId present, else marketplace
  await sequelize.query(`
    UPDATE Carts
    SET channel = CASE
      WHEN websiteId IS NOT NULL THEN 'storefront'
      ELSE 'marketplace'
    END
    WHERE channel IS NULL OR channel = '' OR channel = 'marketplace'
  `).catch(() => {});

  // 3. Inspect existing indexes on Carts
  const existingIndexes = await queryInterface.showIndex('Carts').catch(() => []);
  const indexNames = new Set(existingIndexes.map((idx) => idx.name));

  // Drop old unique constraints on (storeId, buyerId) that prevented cross-channel coexistence
  for (const oldIndex of ['uq_carts_store_buyer', 'carts_store_id_buyer_id']) {
    if (indexNames.has(oldIndex)) {
      try {
        await queryInterface.removeIndex('Carts', oldIndex);
      } catch (_err) {
        // Ignored if already removed
      }
    }
  }

  // 4. Add channel-scoped unique index for store + buyer + channel
  if (!indexNames.has('uq_carts_store_buyer_channel')) {
    try {
      await queryInterface.addIndex('Carts', ['storeId', 'buyerId', 'channel'], {
        name: 'uq_carts_store_buyer_channel',
        unique: true,
      });
    } catch (_err) {
      // Ignored if already exists
    }
  }

  // 5. Add index for guest sessions by store + session + channel
  if (!indexNames.has('idx_carts_store_session_channel')) {
    try {
      await queryInterface.addIndex('Carts', ['storeId', 'sessionId', 'channel'], {
        name: 'idx_carts_store_session_channel',
      });
    } catch (_err) {
      // Ignored if already exists
    }
  }

  // 6. Add index on channel
  if (!indexNames.has('idx_carts_channel')) {
    try {
      await queryInterface.addIndex('Carts', ['channel'], {
        name: 'idx_carts_channel',
      });
    } catch (_err) {
      // Ignored if already exists
    }
  }

  // 7. Add index on websiteId + channel
  if (!indexNames.has('idx_carts_website_channel')) {
    try {
      await queryInterface.addIndex('Carts', ['websiteId', 'channel'], {
        name: 'idx_carts_website_channel',
      });
    } catch (_err) {
      // Ignored if already exists
    }
  }
};

exports.down = async (contextOrQueryInterface, maybeSequelize) => {
  const queryInterface = contextOrQueryInterface.queryInterface || contextOrQueryInterface;

  try {
    await queryInterface.removeIndex('Carts', 'uq_carts_store_buyer_channel');
  } catch (_err) {}
  try {
    await queryInterface.removeIndex('Carts', 'idx_carts_store_session_channel');
  } catch (_err) {}
  try {
    await queryInterface.removeIndex('Carts', 'idx_carts_channel');
  } catch (_err) {}
  try {
    await queryInterface.removeIndex('Carts', 'idx_carts_website_channel');
  } catch (_err) {}
  try {
    await queryInterface.removeColumn('Carts', 'channel');
  } catch (_err) {}
};
