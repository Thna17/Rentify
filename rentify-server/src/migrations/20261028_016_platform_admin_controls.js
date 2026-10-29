'use strict';

const { DataTypes } = require('sequelize');

async function addColumnIfMissing(queryInterface, table, columns, name, definition) {
  if (!columns[name]) await queryInterface.addColumn(table, name, definition);
}

exports.up = async ({ queryInterface }) => {
  const tables = (await queryInterface.showAllTables()).map((table) => String(table).toLowerCase());

  if (!tables.includes('platformrolegrants')) {
    await queryInterface.createTable('PlatformRoleGrants', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false, references: { model: 'Users', key: 'id' }, onDelete: 'CASCADE' },
      role: { type: DataTypes.STRING(48), allowNull: false },
      scopeType: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'platform' },
      scopeId: { type: DataTypes.STRING(128), allowNull: false, defaultValue: '*' },
      status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'active' },
      grantedByUserId: { type: DataTypes.UUID, allowNull: true, references: { model: 'Users', key: 'id' }, onDelete: 'SET NULL' },
      reason: { type: DataTypes.STRING(500), allowNull: false },
      sourceCaseId: { type: DataTypes.UUID, allowNull: true },
      grantedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      revokedAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await queryInterface.addIndex('PlatformRoleGrants', ['userId', 'status'], { name: 'idx_platform_role_grants_user_status' });
    await queryInterface.addIndex('PlatformRoleGrants', ['scopeType', 'scopeId'], { name: 'idx_platform_role_grants_scope' });
    await queryInterface.addIndex('PlatformRoleGrants', ['userId', 'role', 'scopeType', 'scopeId'], { unique: true, name: 'uq_platform_role_grant_scope' });
  }

  if (!tables.includes('adminapprovalrequests')) {
    await queryInterface.createTable('AdminApprovalRequests', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      action: { type: DataTypes.STRING(96), allowNull: false },
      targetType: { type: DataTypes.STRING(64), allowNull: false },
      targetId: { type: DataTypes.STRING(128), allowNull: false },
      scopeType: { type: DataTypes.STRING(24), allowNull: false },
      scopeId: { type: DataTypes.STRING(128), allowNull: true },
      proposedByUserId: { type: DataTypes.UUID, allowNull: false, references: { model: 'Users', key: 'id' } },
      proposedByRole: { type: DataTypes.STRING(48), allowNull: false },
      reason: { type: DataTypes.STRING(500), allowNull: false },
      sourceCaseId: { type: DataTypes.UUID, allowNull: true },
      requestedChange: { type: DataTypes.JSON, allowNull: false },
      requestedChangeHash: { type: DataTypes.STRING(64), allowNull: false },
      beforeVersion: { type: DataTypes.INTEGER, allowNull: true },
      status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'pending' },
      expiresAt: { type: DataTypes.DATE, allowNull: false },
      decidedByUserId: { type: DataTypes.UUID, allowNull: true, references: { model: 'Users', key: 'id' } },
      decidedByRole: { type: DataTypes.STRING(48), allowNull: true },
      decidedAt: { type: DataTypes.DATE, allowNull: true },
      decisionReason: { type: DataTypes.STRING(500), allowNull: true },
      executedAt: { type: DataTypes.DATE, allowNull: true },
      correlationId: { type: DataTypes.STRING(128), allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await queryInterface.addIndex('AdminApprovalRequests', ['status', 'expiresAt'], { name: 'idx_admin_approvals_status_expiry' });
    await queryInterface.addIndex('AdminApprovalRequests', ['targetType', 'targetId'], { name: 'idx_admin_approvals_target' });
  }

  if (!tables.includes('breakglassgrants')) {
    await queryInterface.createTable('BreakGlassGrants', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false, references: { model: 'Users', key: 'id' }, onDelete: 'CASCADE' },
      permissions: { type: DataTypes.JSON, allowNull: false },
      scopeType: { type: DataTypes.STRING(24), allowNull: false },
      scopeId: { type: DataTypes.STRING(128), allowNull: true },
      reason: { type: DataTypes.STRING(500), allowNull: false },
      sourceCaseId: { type: DataTypes.UUID, allowNull: false },
      status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'active' },
      startsAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      expiresAt: { type: DataTypes.DATE, allowNull: false },
      revokedAt: { type: DataTypes.DATE, allowNull: true },
      revokedByUserId: { type: DataTypes.UUID, allowNull: true, references: { model: 'Users', key: 'id' } },
      correlationId: { type: DataTypes.STRING(128), allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await queryInterface.addIndex('BreakGlassGrants', ['userId', 'status', 'expiresAt'], { name: 'idx_break_glass_user_status_expiry' });
    await queryInterface.addIndex('BreakGlassGrants', ['scopeType', 'scopeId'], { name: 'idx_break_glass_scope' });
  }

  if (tables.includes('auditlogs')) {
    const columns = await queryInterface.describeTable('AuditLogs');
    await addColumnIfMissing(queryInterface, 'AuditLogs', columns, 'actorRoles', { type: DataTypes.JSON, allowNull: true });
    await addColumnIfMissing(queryInterface, 'AuditLogs', columns, 'effectivePermissions', { type: DataTypes.JSON, allowNull: true });
    await addColumnIfMissing(queryInterface, 'AuditLogs', columns, 'reason', { type: DataTypes.STRING(500), allowNull: true });
    await addColumnIfMissing(queryInterface, 'AuditLogs', columns, 'sourceCaseId', { type: DataTypes.UUID, allowNull: true });
    await addColumnIfMissing(queryInterface, 'AuditLogs', columns, 'tenantScope', { type: DataTypes.STRING(160), allowNull: true });
    await addColumnIfMissing(queryInterface, 'AuditLogs', columns, 'approvalRequestId', { type: DataTypes.UUID, allowNull: true });
    await addColumnIfMissing(queryInterface, 'AuditLogs', columns, 'breakGlassGrantId', { type: DataTypes.UUID, allowNull: true });
    await addColumnIfMissing(queryInterface, 'AuditLogs', columns, 'safeBefore', { type: DataTypes.JSON, allowNull: true });
    await addColumnIfMissing(queryInterface, 'AuditLogs', columns, 'safeAfter', { type: DataTypes.JSON, allowNull: true });
  }
};

exports.down = async ({ queryInterface }) => {
  const tables = (await queryInterface.showAllTables()).map((table) => String(table).toLowerCase());
  if (tables.includes('auditlogs')) {
    const columns = await queryInterface.describeTable('AuditLogs');
    for (const name of ['safeAfter', 'safeBefore', 'breakGlassGrantId', 'approvalRequestId',
      'tenantScope', 'sourceCaseId', 'reason', 'effectivePermissions', 'actorRoles']) {
      if (columns[name]) await queryInterface.removeColumn('AuditLogs', name);
    }
  }
  if (tables.includes('breakglassgrants')) await queryInterface.dropTable('BreakGlassGrants');
  if (tables.includes('adminapprovalrequests')) await queryInterface.dropTable('AdminApprovalRequests');
  if (tables.includes('platformrolegrants')) await queryInterface.dropTable('PlatformRoleGrants');
};
