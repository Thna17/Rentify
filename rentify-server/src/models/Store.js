const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Store = sequelize.define('Store', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  ownerUserId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: { model: 'Users', key: 'id' },
  },
  name: { type: DataTypes.STRING(120), allowNull: false },
  slug: { type: DataTypes.STRING(160), allowNull: false, unique: true },
  primaryCategory: { type: DataTypes.STRING(120), allowNull: true },
  needsCategoryReview: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  marketplaceEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  marketplaceApprovalStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'needs_changes', 'rejected', 'suspended'),
    allowNull: false,
    defaultValue: 'pending',
  },
  status: {
    type: DataTypes.ENUM('active', 'suspended', 'closed'),
    allowNull: false,
    defaultValue: 'active',
  },
}, { timestamps: true });

module.exports = Store;
