const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
module.exports = sequelize.define('SupportCaseAttachment', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  caseId: { type: DataTypes.UUID, allowNull: false },
  uploaderId: { type: DataTypes.UUID, allowNull: false },
  mediaAssetId: { type: DataTypes.UUID, allowNull: false },
  visibility: { type: DataTypes.STRING(24), allowNull: false },
  mediaType: { type: DataTypes.STRING(100), allowNull: false },
  sizeBytes: { type: DataTypes.INTEGER, allowNull: false },
  sha256: { type: DataTypes.STRING(64), allowNull: false },
  scanStatus: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'pending' },
  retentionPolicyVersion: { type: DataTypes.STRING(64), allowNull: true },
}, { timestamps: true, updatedAt: false, indexes: [{ fields: ['caseId', 'createdAt', 'id'] }] });
