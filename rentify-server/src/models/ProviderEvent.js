'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ProviderEvent = sequelize.define('ProviderEvent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  provider: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'cutluy',
  },
  providerEventId: {
    type: DataTypes.STRING(128),
    allowNull: false,
  },
  eventType: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  paymentAttemptId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  providerPaymentId: {
    type: DataTypes.STRING(128),
    allowNull: true,
  },
  accountRef: {
    type: DataTypes.STRING(128),
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING(32),
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: true,
    defaultValue: 'USD',
  },
  payload: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  signature: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  processed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  processedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  processingError: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  replayCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  replayedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  replayedBy: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
}, {
  tableName: 'ProviderEvents',
  indexes: [
    { unique: true, fields: ['provider', 'providerEventId'] },
    { fields: ['paymentAttemptId'] },
    { fields: ['processed', 'createdAt'] },
  ],
});

module.exports = ProviderEvent;
