// ecommerce-server/migrations/20261028_025_restricted_product_moderation.js
// Migration 025: P5-TRUST-001 Restricted Product Enforcement and Moderation History.
// Adds policy violation reason code and appeal tracking columns to Products,
// and creates an immutable ProductModerationHistories audit table.

const { DataTypes } = require('sequelize');

exports.up = async (contextOrQueryInterface, maybeSequelize) => {
  const queryInterface = contextOrQueryInterface.queryInterface || contextOrQueryInterface;
  const sequelize = contextOrQueryInterface.sequelize || maybeSequelize || queryInterface.sequelize;

  // 1. Add policy and appeal columns to Products idempotently
  const productTableDesc = await queryInterface.describeTable('Products').catch(() => ({}));

  if (!productTableDesc.prohibitedReasonCode) {
    await queryInterface.addColumn('Products', 'prohibitedReasonCode', {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: 'P5-TRUST-001: Reason code from versioned restricted taxonomy',
    });
  }

  if (!productTableDesc.moderationNotes) {
    await queryInterface.addColumn('Products', 'moderationNotes', {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'P5-TRUST-001: Safe merchant-facing moderation guidance',
    });
  }

  if (!productTableDesc.appealStatus) {
    await queryInterface.addColumn('Products', 'appealStatus', {
      type: DataTypes.STRING(32),
      defaultValue: 'none',
      allowNull: false,
      comment: 'P5-TRUST-001: Appeal lifecycle status (none, pending, approved, rejected)',
    });
  }

  if (!productTableDesc.appealedAt) {
    await queryInterface.addColumn('Products', 'appealedAt', {
      type: DataTypes.DATE,
      allowNull: true,
    });
  }

  if (!productTableDesc.moderatedAt) {
    await queryInterface.addColumn('Products', 'moderatedAt', {
      type: DataTypes.DATE,
      allowNull: true,
    });
  }

  if (!productTableDesc.moderatedBy) {
    await queryInterface.addColumn('Products', 'moderatedBy', {
      type: DataTypes.STRING(64),
      allowNull: true,
    });
  }

  // 2. Create ProductModerationHistories table idempotently
  const tables = await queryInterface.showAllTables().catch(() => []);
  const tableNames = new Set(tables.map((t) => (typeof t === 'string' ? t : t.tableName || t.name)));

  if (!tableNames.has('ProductModerationHistories')) {
    await queryInterface.createTable('ProductModerationHistories', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      storeId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      action: {
        type: DataTypes.STRING(32),
        allowNull: false,
        comment: 'system_flag, flag, reject, approve, appeal_submitted, appeal_approved, appeal_rejected',
      },
      previousStatus: {
        type: DataTypes.STRING(32),
        allowNull: true,
      },
      newStatus: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      reasonCode: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      evidence: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      actorId: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      actorType: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: 'system',
      },
      idempotencyKey: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    try {
      await queryInterface.addIndex('ProductModerationHistories', ['productId', 'createdAt'], {
        name: 'idx_pmh_product_created',
      });
      await queryInterface.addIndex('ProductModerationHistories', ['storeId'], {
        name: 'idx_pmh_store_id',
      });
      await queryInterface.addIndex('ProductModerationHistories', ['idempotencyKey'], {
        name: 'idx_pmh_idempotency_key',
      });
      await queryInterface.addIndex('ProductModerationHistories', ['action'], {
        name: 'idx_pmh_action',
      });
    } catch (_err) {
      // Indexes may already exist
    }
  }
};

exports.down = async (contextOrQueryInterface) => {
  const queryInterface = contextOrQueryInterface.queryInterface || contextOrQueryInterface;

  await queryInterface.dropTable('ProductModerationHistories').catch(() => {});

  const productTableDesc = await queryInterface.describeTable('Products').catch(() => ({}));
  if (productTableDesc.prohibitedReasonCode) {
    await queryInterface.removeColumn('Products', 'prohibitedReasonCode').catch(() => {});
  }
  if (productTableDesc.moderationNotes) {
    await queryInterface.removeColumn('Products', 'moderationNotes').catch(() => {});
  }
  if (productTableDesc.appealStatus) {
    await queryInterface.removeColumn('Products', 'appealStatus').catch(() => {});
  }
  if (productTableDesc.appealedAt) {
    await queryInterface.removeColumn('Products', 'appealedAt').catch(() => {});
  }
  if (productTableDesc.moderatedAt) {
    await queryInterface.removeColumn('Products', 'moderatedAt').catch(() => {});
  }
  if (productTableDesc.moderatedBy) {
    await queryInterface.removeColumn('Products', 'moderatedBy').catch(() => {});
  }
};
