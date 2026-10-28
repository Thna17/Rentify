const { DataTypes: T } = require('sequelize');
const db = require('../config/db');
module.exports = db.define('NotificationDeliveryAttempt', {
  id: { type: T.UUID, defaultValue: T.UUIDV4, primaryKey: true },
  deliveryId: { type: T.UUID, allowNull: false }, number: { type: T.INTEGER, allowNull: false },
  status: { type: T.STRING(24), allowNull: false }, errorCode: { type: T.STRING(64), allowNull: true },
  providerReference: { type: T.STRING(128), allowNull: true },
}, { updatedAt: false, indexes: [{ unique: true, fields: ['deliveryId', 'number'], name: 'uq_notification_attempt_number' }] });
