const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const StoreAccess = sequelize.define('StoreAccess', {
  storeId: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
  ownerUserId: { type: DataTypes.UUID, allowNull: false },
  websiteId: { type: DataTypes.UUID, allowNull: true, unique: true },
  primaryCategory: { type: DataTypes.STRING(120), allowNull: true },
  needsCategoryReview: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  marketplaceEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  marketplaceApprovalStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'needs_changes', 'rejected', 'suspended'),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('active', 'suspended', 'closed'),
    allowNull: false,
  },
  version: { type: DataTypes.INTEGER, allowNull: false },
  marketplaceEntitlement: {
    type: DataTypes.ENUM('pilot', 'none'), allowNull: false, defaultValue: 'pilot',
  },
}, { indexes: [{ fields: ['ownerUserId'] }] });

module.exports = StoreAccess;
