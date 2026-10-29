const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AdminApprovalRequest = sequelize.define('AdminApprovalRequest', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  action: { type: DataTypes.STRING(96), allowNull: false },
  targetType: { type: DataTypes.STRING(64), allowNull: false },
  targetId: { type: DataTypes.STRING(128), allowNull: false },
  scopeType: { type: DataTypes.STRING(24), allowNull: false },
  scopeId: { type: DataTypes.STRING(128), allowNull: true },
  proposedByUserId: { type: DataTypes.UUID, allowNull: false },
  proposedByRole: { type: DataTypes.STRING(48), allowNull: false },
  reason: { type: DataTypes.STRING(500), allowNull: false },
  sourceCaseId: { type: DataTypes.UUID, allowNull: true },
  requestedChange: { type: DataTypes.JSON, allowNull: false },
  requestedChangeHash: { type: DataTypes.STRING(64), allowNull: false },
  beforeVersion: { type: DataTypes.INTEGER, allowNull: true },
  status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'pending' },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  decidedByUserId: { type: DataTypes.UUID, allowNull: true },
  decidedByRole: { type: DataTypes.STRING(48), allowNull: true },
  decidedAt: { type: DataTypes.DATE, allowNull: true },
  decisionReason: { type: DataTypes.STRING(500), allowNull: true },
  executedAt: { type: DataTypes.DATE, allowNull: true },
  correlationId: { type: DataTypes.STRING(128), allowNull: true },
}, {
  timestamps: true,
  indexes: [
    { fields: ['status', 'expiresAt'] },
    { fields: ['targetType', 'targetId'] },
    { fields: ['proposedByUserId'] },
  ],
});

module.exports = AdminApprovalRequest;
