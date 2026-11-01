const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
module.exports = sequelize.define('CampaignSubmission', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  campaignId: { type: DataTypes.UUID, allowNull: false },
  storeId: { type: DataTypes.UUID, allowNull: false },
  productId: { type: DataTypes.UUID, allowNull: false },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
  merchantNote: { type: DataTypes.STRING(1000), allowNull: false, defaultValue: '' },
  reviewNote: { type: DataTypes.STRING(1000), allowNull: false, defaultValue: '' },
  reviewedBy: { type: DataTypes.STRING(64), allowNull: true },
  approvedFingerprint: { type: DataTypes.STRING(64), allowNull: true },
  revision: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
}, { tableName: 'CampaignSubmissions', indexes: [{ unique: true, fields: ['campaignId', 'productId'] }, { fields: ['storeId'] }] });
