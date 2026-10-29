const { DataTypes: T } = require('sequelize');
const db = require('../config/db');
module.exports = db.define('NotificationDelivery', {
  id: { type: T.UUID, defaultValue: T.UUIDV4, primaryKey: true },
  notificationId: { type: T.UUID, allowNull: false }, channel: { type: T.STRING(20), allowNull: false },
  dedupeKey: { type: T.STRING(64), allowNull: false, unique: true },
  status: { type: T.STRING(24), allowNull: false, defaultValue: 'pending' },
  attempts: { type: T.INTEGER, allowNull: false, defaultValue: 0 },
  nextAttemptAt: { type: T.DATE, allowNull: true }, lastErrorCode: { type: T.STRING(64), allowNull: true },
  lockedUntil: { type: T.DATE, allowNull: true },
  providerReference: { type: T.STRING(128), allowNull: true }, sentAt: { type: T.DATE, allowNull: true },
}, { indexes: [{ unique: true, fields: ['notificationId', 'channel'], name: 'uq_notification_delivery_channel' },
  { fields: ['status', 'nextAttemptAt'] }] });
