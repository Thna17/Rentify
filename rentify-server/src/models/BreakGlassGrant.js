const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const BreakGlassGrant = sequelize.define('BreakGlassGrant', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  permissions: { type: DataTypes.JSON, allowNull: false },
  scopeType: { type: DataTypes.STRING(24), allowNull: false },
  scopeId: { type: DataTypes.STRING(128), allowNull: true },
  reason: { type: DataTypes.STRING(500), allowNull: false },
  sourceCaseId: { type: DataTypes.UUID, allowNull: false },
  status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'active' },
  startsAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  revokedAt: { type: DataTypes.DATE, allowNull: true },
  revokedByUserId: { type: DataTypes.UUID, allowNull: true },
  correlationId: { type: DataTypes.STRING(128), allowNull: true },
}, {
  timestamps: true,
  indexes: [
    { fields: ['userId', 'status', 'expiresAt'] },
    { fields: ['scopeType', 'scopeId'] },
  ],
});

module.exports = BreakGlassGrant;
