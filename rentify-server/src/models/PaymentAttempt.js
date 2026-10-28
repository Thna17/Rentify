'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PaymentAttempt = sequelize.define('PaymentAttempt', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  businessType: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'subscription',
  },
  businessReference: {
    type: DataTypes.STRING(128),
    allowNull: false,
  },
  accountType: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'subscription',
  },
  accountRef: {
    type: DataTypes.STRING(128),
    allowNull: false,
  },
  provider: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'cutluy',
  },
  providerPaymentId: {
    type: DataTypes.STRING(128),
    allowNull: true,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'USD',
  },
  status: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'pending',
  },
  providerStatus: {
    type: DataTypes.STRING(32),
    allowNull: true,
  },
  idempotencyKey: {
    type: DataTypes.STRING(128),
    allowNull: false,
    unique: true,
  },
  checkoutUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  rawResponse: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  failedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  failureReason: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
}, {
  tableName: 'PaymentAttempts',
  indexes: [
    { fields: ['businessReference'] },
    { fields: ['providerPaymentId'] },
    { fields: ['status', 'createdAt'] },
    { fields: ['accountType', 'accountRef'] },
  ],
});

module.exports = PaymentAttempt;
