// ecommerce-server/models/ProductModerationHistory.js
// P5-TRUST-001: Immutable moderation and appeal audit history.

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ProductModerationHistory = sequelize.define(
  'ProductModerationHistory',
  {
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
      defaultValue: null,
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
  },
  {
    indexes: [
      { fields: ['productId', 'createdAt'] },
      { fields: ['storeId'] },
      { fields: ['idempotencyKey'] },
      { fields: ['action'] },
    ],
    hooks: {
      beforeUpdate() {
        throw new Error('IMMUTABLE_AUDIT_HISTORY: ProductModerationHistory records cannot be updated');
      },
      beforeDestroy() {
        throw new Error('IMMUTABLE_AUDIT_HISTORY: ProductModerationHistory records cannot be deleted');
      },
    },
  }
);

module.exports = ProductModerationHistory;
