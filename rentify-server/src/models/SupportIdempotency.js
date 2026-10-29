const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
module.exports = sequelize.define('SupportIdempotency', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  actorId: { type: DataTypes.UUID, allowNull: false },
  operation: { type: DataTypes.STRING(96), allowNull: false },
  tenantScope: { type: DataTypes.STRING(160), allowNull: false },
  keyHash: { type: DataTypes.STRING(64), allowNull: false },
  requestHash: { type: DataTypes.STRING(64), allowNull: false },
  caseId: { type: DataTypes.UUID, allowNull: false },
  result: { type: DataTypes.JSON, allowNull: false },
}, { timestamps: true, updatedAt: false, indexes: [{ unique: true, fields: ['actorId', 'operation', 'tenantScope', 'keyHash'], name: 'uq_support_idempotency_scope' }] });
