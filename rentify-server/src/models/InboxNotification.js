const { DataTypes: T } = require('sequelize');
const db = require('../config/db');
module.exports = db.define('InboxNotification', {
  id: { type: T.UUID, defaultValue: T.UUIDV4, primaryKey: true },
  eventId: { type: T.UUID, allowNull: false }, eventName: { type: T.STRING(120), allowNull: false },
  schemaVersion: { type: T.STRING(20), allowNull: false },
  recipientKind: { type: T.STRING(20), allowNull: false }, recipientId: { type: T.STRING(128), allowNull: false },
  storeId: { type: T.UUID, allowNull: true }, aggregateType: { type: T.STRING(64), allowNull: false },
  aggregateId: { type: T.STRING(128), allowNull: false }, templateKey: { type: T.STRING(120), allowNull: false },
  templateVersion: { type: T.INTEGER, allowNull: false }, locale: { type: T.STRING(8), allowNull: false },
  title: { type: T.STRING(255), allowNull: false }, body: { type: T.STRING(500), allowNull: false },
  mandatory: { type: T.BOOLEAN, allowNull: false }, correlationId: { type: T.STRING(128), allowNull: false },
  sourceOccurredAt: { type: T.DATE, allowNull: false }, readAt: { type: T.DATE, allowNull: true },
}, { indexes: [{ unique: true, fields: ['eventId', 'recipientKind', 'recipientId'], name: 'uq_notification_event_recipient' },
  { fields: ['recipientKind', 'recipientId', 'createdAt', 'id'] }] });
