const { DataTypes: T } = require('sequelize');
const db = require('../config/db');
module.exports = db.define('NotificationPreference', {
  id: { type: T.UUID, defaultValue: T.UUIDV4, primaryKey: true },
  recipientKind: { type: T.STRING(20), allowNull: false }, recipientId: { type: T.STRING(128), allowNull: false },
  locale: { type: T.STRING(8), allowNull: false, defaultValue: 'en' },
  optionalEnabled: { type: T.BOOLEAN, allowNull: false, defaultValue: true },
  emailEnabled: { type: T.BOOLEAN, allowNull: false, defaultValue: false },
  telegramEnabled: { type: T.BOOLEAN, allowNull: false, defaultValue: false },
}, { indexes: [{ unique: true, fields: ['recipientKind', 'recipientId'], name: 'uq_notification_preference_subject' }] });
