const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
module.exports = sequelize.define('MarketplaceCampaign', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  slug: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  title: { type: DataTypes.STRING(160), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  bannerUrl: { type: DataTypes.STRING(1000), allowNull: false },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'draft' },
  startsAt: { type: DataTypes.DATE, allowNull: false },
  endsAt: { type: DataTypes.DATE, allowNull: false },
  submissionEndsAt: { type: DataTypes.DATE, allowNull: false },
  minimumDiscount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  homepage: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  priority: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  revision: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  createdBy: { type: DataTypes.STRING(64), allowNull: false },
}, { tableName: 'MarketplaceCampaigns' });
