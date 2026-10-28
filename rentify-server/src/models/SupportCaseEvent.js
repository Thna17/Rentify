const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
module.exports = sequelize.define('SupportCaseEvent', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  caseId: { type: DataTypes.UUID, allowNull: false },
  version: { type: DataTypes.INTEGER, allowNull: false },
  action: { type: DataTypes.STRING(64), allowNull: false },
  actorId: { type: DataTypes.UUID, allowNull: false },
  actorRoles: { type: DataTypes.JSON, allowNull: false },
  permissions: { type: DataTypes.JSON, allowNull: false },
  tenantScope: { type: DataTypes.STRING(160), allowNull: false },
  reason: { type: DataTypes.STRING(500), allowNull: false },
  before: { type: DataTypes.JSON, allowNull: true },
  after: { type: DataTypes.JSON, allowNull: true },
  correlationId: { type: DataTypes.STRING(128), allowNull: true },
  idempotencyKeyHash: { type: DataTypes.STRING(64), allowNull: true },
}, { timestamps: true, updatedAt: false, indexes: [{ unique: true, fields: ['caseId', 'version'] }],
  hooks: {
    beforeUpdate: () => { throw new Error('Support events are append-only'); },
    beforeDestroy: () => { throw new Error('Support events are append-only'); },
    beforeBulkUpdate: () => { throw new Error('Support events are append-only'); },
    beforeBulkDestroy: () => { throw new Error('Support events are append-only'); },
  },
});
