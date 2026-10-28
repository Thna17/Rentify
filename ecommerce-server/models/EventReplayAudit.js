const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const EventReplayAudit = sequelize.define('EventReplayAudit', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  replayId: { type: DataTypes.UUID, allowNull: false },
  actorId: { type: DataTypes.STRING(128), allowNull: false },
  eventId: { type: DataTypes.UUID, allowNull: false },
  eventType: { type: DataTypes.STRING(120), allowNull: false },
  aggregateType: { type: DataTypes.STRING(64), allowNull: false },
  aggregateId: { type: DataTypes.STRING(64), allowNull: false },
  target: { type: DataTypes.ENUM('outbox', 'inbox'), allowNull: false },
  reason: { type: DataTypes.TEXT, allowNull: false },
  status: {
    type: DataTypes.ENUM('initiated', 'success', 'failed'),
    allowNull: false,
    defaultValue: 'initiated',
  },
  error: { type: DataTypes.TEXT, allowNull: true },
  correlationId: { type: DataTypes.STRING(128), allowNull: true },
}, {
  indexes: [
    { fields: ['replayId'] },
    { fields: ['eventId'] },
    { fields: ['actorId', 'createdAt'] },
    { fields: ['aggregateType', 'aggregateId'] },
  ],
});

module.exports = EventReplayAudit;
