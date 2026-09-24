const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SellerReview = sequelize.define('SellerReview', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  storeId: {
    type: DataTypes.UUID, allowNull: false,
    references: { model: 'Stores', key: 'id' },
  },
  reviewerUserId: {
    type: DataTypes.UUID, allowNull: false,
    references: { model: 'Users', key: 'id' },
  },
  decision: {
    type: DataTypes.ENUM('approved', 'needs_changes', 'rejected', 'suspended'),
    allowNull: false,
  },
  checklist: { type: DataTypes.JSON, allowNull: false },
  reason: { type: DataTypes.STRING(500), allowNull: true },
}, { updatedAt: false });

module.exports = SellerReview;
