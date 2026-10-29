const { DataTypes: T } = require('sequelize');
const db = require('../config/db');
module.exports = db.define('NotificationSourceEvent', {
  id: { type: T.UUID, primaryKey: true }, eventName: { type: T.STRING(120), allowNull: false },
  payloadHash: { type: T.STRING(64), allowNull: false }, correlationId: { type: T.STRING(128), allowNull: false },
}, { updatedAt: false });
