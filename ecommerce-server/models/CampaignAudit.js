const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
module.exports = sequelize.define('CampaignAudit', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  campaignId: { type: DataTypes.UUID, allowNull: false },
  submissionId: { type: DataTypes.UUID, allowNull: true },
  actorId: { type: DataTypes.STRING(64), allowNull: false },
  action: { type: DataTypes.STRING(40), allowNull: false },
  details: { type: DataTypes.JSON, allowNull: false },
}, { tableName: 'CampaignAudits', updatedAt: false });
