'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

module.exports = sequelize.define('ProductAnalyticsEvent', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  eventId: { type: DataTypes.UUID, allowNull: false, unique: true },
  eventName: { type: DataTypes.STRING(120), allowNull: false },
  schemaVersion: { type: DataTypes.STRING(20), allowNull: false },
  catalogVersion: { type: DataTypes.STRING(20), allowNull: false },
  source: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'browser' },
  storeId: { type: DataTypes.UUID, allowNull: true },
  channel: { type: DataTypes.STRING(24), allowNull: false },
  locale: { type: DataTypes.STRING(8), allowNull: true },
  properties: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
  measures: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
  occurredAt: { type: DataTypes.DATE, allowNull: false },
}, {
  indexes: [
    { fields: ['eventName', 'occurredAt'] },
    { fields: ['storeId', 'occurredAt'] },
  ],
});
