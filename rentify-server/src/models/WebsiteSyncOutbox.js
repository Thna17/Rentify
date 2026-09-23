const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const WebsiteSyncOutbox = sequelize.define('WebsiteSyncOutbox', {
  websiteId: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
  },
  payload: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'synced'),
    allowNull: false,
    defaultValue: 'pending',
  },
  attempts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  lastError: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  syncedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  timestamps: true,
  indexes: [{ fields: ['status', 'updatedAt'] }],
});

module.exports = WebsiteSyncOutbox;
