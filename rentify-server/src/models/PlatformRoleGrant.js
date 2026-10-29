const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const { PLATFORM_ROLES, SCOPE_TYPES } = require('../config/platformAuthorization');

const PlatformRoleGrant = sequelize.define('PlatformRoleGrant', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  role: { type: DataTypes.STRING(48), allowNull: false,
    validate: { isIn: [Object.values(PLATFORM_ROLES)] } },
  scopeType: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'platform',
    validate: { isIn: [SCOPE_TYPES] } },
  scopeId: { type: DataTypes.STRING(128), allowNull: false, defaultValue: '*' },
  status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'active',
    validate: { isIn: [['active', 'revoked']] } },
  grantedByUserId: { type: DataTypes.UUID, allowNull: true },
  reason: { type: DataTypes.STRING(500), allowNull: false },
  sourceCaseId: { type: DataTypes.UUID, allowNull: true },
  grantedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  revokedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  timestamps: true,
  indexes: [
    { fields: ['userId', 'status'] },
    { fields: ['scopeType', 'scopeId'] },
    { unique: true, fields: ['userId', 'role', 'scopeType', 'scopeId'], name: 'uq_platform_role_grant_scope' },
  ],
});

module.exports = PlatformRoleGrant;
