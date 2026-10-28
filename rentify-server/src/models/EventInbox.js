const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const EventInbox = sequelize.define('EventInbox', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  eventId: { type: DataTypes.UUID, allowNull: false, unique: true },
  eventType: { type: DataTypes.STRING(120), allowNull: false },
  schemaVersion: { type: DataTypes.STRING(20), allowNull: false, defaultValue: '1.0.0' },
  aggregateType: { type: DataTypes.STRING(64), allowNull: false },
  aggregateId: { type: DataTypes.STRING(64), allowNull: false },
  aggregateVersion: { type: DataTypes.INTEGER, allowNull: false },
  occurredAt: { type: DataTypes.DATE, allowNull: false },
  producer: { type: DataTypes.STRING(64), allowNull: false },
  consumer: { type: DataTypes.STRING(64), allowNull: false },
  correlationId: { type: DataTypes.STRING(128), allowNull: true },
  causationId: { type: DataTypes.STRING(128), allowNull: true },
  storeId: { type: DataTypes.UUID, allowNull: true },
  payload: { type: DataTypes.JSON, allowNull: false },
  status: {
    type: DataTypes.ENUM('received', 'processing', 'processed', 'ignored', 'dead_letter'),
    allowNull: false,
    defaultValue: 'received',
  },
  attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  maxAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
  nextAttemptAt: { type: DataTypes.DATE, allowNull: true },
  lastError: { type: DataTypes.TEXT, allowNull: true },
  errorClassification: {
    type: DataTypes.ENUM('transient', 'fatal', 'poison'),
    allowNull: true,
  },
  processedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  indexes: [
    { fields: ['status', 'nextAttemptAt'] },
    { fields: ['aggregateType', 'aggregateId', 'aggregateVersion'] },
    { fields: ['storeId'] },
    { fields: ['correlationId'] },
  ],
});

module.exports = EventInbox;
