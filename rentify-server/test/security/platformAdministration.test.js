const test = require('node:test');
const assert = require('node:assert/strict');

const models = require('../../src/models');
const config = require('../../src/config/platformAuthorization');
const platformAuth = require('../../src/middlewares/platformAuthorization');
const approvalService = require('../../src/utils/adminApprovalService');
const { emitAuditEvent, sanitizeAuditData } = require('../../src/utils/auditLogger');
const migration = require('../../src/migrations/20261028_016_platform_admin_controls');
const accessController = require('../../src/modules/admin/adminAccessController');
const sessionManager = require('../../src/utils/sessionManager');

const response = () => ({ statusCode: 200, body: null,
  status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

const expected = {
  support_agent: ['support.case.read', 'support.case.create', 'support.case.update', 'support.case.assign',
    'support.case.escalate', 'support.case.resolve', 'support.case.reopen', 'support.note.create',
    'support.attachment.create', 'support.attachment.read', 'support.communication.send'],
  seller_reviewer: ['seller.application.read', 'seller.decision.propose', 'seller.decision.approve',
    'seller.store.suspend.propose', 'seller.store.suspend.approve', 'seller.audit.read'],
  catalog_moderator: ['catalog.product.read', 'catalog.product.hold', 'catalog.product.reject.propose',
    'catalog.product.reject.approve', 'catalog.product.restore', 'catalog.appeal.read',
    'catalog.appeal.decide', 'catalog.audit.read'],
  finance_reconciliation: ['finance.subscription.read', 'finance.subscription.transition.propose',
    'finance.subscription.transition.approve', 'finance.payment.read', 'finance.reconciliation.run',
    'finance.reconciliation.repair.propose', 'finance.reconciliation.repair.approve',
    'finance.export.sensitive.propose', 'finance.export.sensitive.approve', 'finance.audit.read'],
};

test('P5-ADM-001: every canonical role expands to only its frozen permission combinations', () => {
  for (const [role, permissions] of Object.entries(expected)) {
    assert.deepEqual(config.permissionsForRole(role), permissions, role);
    for (const permission of config.ALL_PLATFORM_PERMISSIONS) {
      assert.equal(config.permissionsForRole(role).includes(permission), permissions.includes(permission), `${role}/${permission}`);
    }
  }
  assert.deepEqual(new Set(config.permissionsForRole('platform_admin')), new Set(config.ALL_PLATFORM_PERMISSIONS));
  assert.equal(config.permissionsForRole('unknown').length, 0);
});

test('P5-ADM-001: legacy administrators retain the frozen platform-admin permissions', async (t) => {
  t.mock.method(models.User, 'findByPk', async () => ({ id: 'admin-1', role: 'admin', mfaEnabled: true }));
  const access = await platformAuth.resolvePlatformAccess('admin-1');
  assert.equal(access.compatibilityAdmin, true);
  assert.deepEqual(new Set(access.permissions), new Set(config.ALL_PLATFORM_PERMISSIONS));
});

test('P5-ADM-001: store-scoped grants deny cross-tenant and missing permissions', async (t) => {
  t.mock.method(models.User, 'findByPk', async () => ({ id: 'reviewer-1', role: 'user', mfaEnabled: true }));
  t.mock.method(models.PlatformRoleGrant, 'findAll', async () => [{ role: 'seller_reviewer', scopeType: 'store', scopeId: 'store-a', status: 'active' }]);
  t.mock.method(models.BreakGlassGrant, 'findAll', async () => []);
  const allow = platformAuth.createRequirePlatformPermission({ anyOf: ['seller.application.read'],
    scope: (req) => ({ type: 'store', id: req.params.storeId }) });
  let called = false;
  await allow({ user: { id: 'reviewer-1' }, params: { storeId: 'store-a' } }, response(), () => { called = true; });
  assert.equal(called, true);
  const cross = response();
  await allow({ user: { id: 'reviewer-1' }, params: { storeId: 'store-b' } }, cross, () => {});
  assert.equal(cross.statusCode, 403);
  assert.equal(cross.body.error.code, 'PERMISSION_DENIED');
  const finance = response();
  await platformAuth.createRequirePlatformPermission({ anyOf: ['finance.payment.read'],
    scope: () => ({ type: 'store', id: 'store-a' }) })({ user: { id: 'reviewer-1' } }, finance, () => {});
  assert.equal(finance.statusCode, 403);
});

test('P5-ADM-001: maker-checker forbids self-approval and rejects expired approvals', async (t) => {
  const self = { id: 'approval-1', proposedByUserId: 'same-user', status: 'pending',
    expiresAt: new Date(Date.now() + 60000), update: async () => {} };
  t.mock.method(models.AdminApprovalRequest, 'findByPk', async () => self);
  await assert.rejects(() => approvalService.decide({ approvalId: self.id, actorUserId: 'same-user',
    actorRole: 'seller_reviewer', decision: 'approved' }), (error) => error.code === 'APPROVAL_SELF_REVIEW_FORBIDDEN');
  self.proposedByUserId = 'other-user';
  self.expiresAt = new Date(Date.now() - 1);
  await assert.rejects(() => approvalService.decide({ approvalId: self.id, actorUserId: 'checker',
    actorRole: 'seller_reviewer', decision: 'approved' }), (error) => error.code === 'APPROVAL_STALE');
});

test('P5-ADM-001: approvals bind exact change and are single-use', async (t) => {
  const change = { decision: 'rejected', reason: 'policy evidence' };
  const approval = { id: 'approval-2', status: 'approved', executedAt: null,
    expiresAt: new Date(Date.now() + 60000), action: 'seller.decision.reject', targetType: 'Store',
    targetId: 'store-a', requestedChangeHash: approvalService.changeHash(change), beforeVersion: 3,
    update: async (values) => Object.assign(approval, values) };
  t.mock.method(models.AdminApprovalRequest, 'findByPk', async () => approval);
  t.mock.method(models.AdminApprovalRequest, 'update', async () => [approval.status === 'approved' ? 1 : 0]);
  await approvalService.consume({ approvalId: approval.id, action: approval.action, targetType: 'Store',
    targetId: 'store-a', requestedChange: change, beforeVersion: 3 });
  assert.equal(approval.status, 'executed');
  await assert.rejects(() => approvalService.consume({ approvalId: approval.id, action: approval.action,
    targetType: 'Store', targetId: 'store-a', requestedChange: change, beforeVersion: 3 }),
  (error) => error.code === 'APPROVAL_STALE');
  assert.equal(approvalService.validateChange('platform.identity.change', { password: 'must-not-persist' }), false);
});

test('P5-ADM-001: expired break-glass never contributes a permission', async (t) => {
  t.mock.method(models.User, 'findByPk', async () => ({ id: 'operator-1', role: 'user', mfaEnabled: true }));
  t.mock.method(models.PlatformRoleGrant, 'findAll', async () => []);
  t.mock.method(models.BreakGlassGrant, 'findAll', async () => [{ id: 'bg-1', status: 'active',
    startsAt: new Date(Date.now() - 120000), expiresAt: new Date(Date.now() - 60000),
    scopeType: 'store', scopeId: 'store-a', permissions: ['seller.application.read'] }]);
  const res = response();
  await platformAuth.createRequirePlatformPermission({ anyOf: ['seller.application.read'],
    scope: () => ({ type: 'store', id: 'store-a' }) })({ user: { id: 'operator-1' } }, res, () => {});
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error.code, 'PERMISSION_DENIED');
});

test('P5-ADM-001: break-glass requires policy enablement, reason, case and bounded expiry', async (t) => {
  const oldEnabled = process.env.PLATFORM_BREAK_GLASS_ENABLED;
  const oldMax = process.env.PLATFORM_BREAK_GLASS_MAX_MINUTES;
  t.after(() => {
    if (oldEnabled === undefined) delete process.env.PLATFORM_BREAK_GLASS_ENABLED;
    else process.env.PLATFORM_BREAK_GLASS_ENABLED = oldEnabled;
    if (oldMax === undefined) delete process.env.PLATFORM_BREAK_GLASS_MAX_MINUTES;
    else process.env.PLATFORM_BREAK_GLASS_MAX_MINUTES = oldMax;
  });
  const baseReq = { user: { id: 'admin-1' }, platformAccess: { roles: ['platform_admin'],
    effectivePermissions: ['platform.break_glass.use'], tenantScope: 'platform/*' },
  body: { permissions: ['platform.audit.read'], scopeType: 'platform', reason: 'incident response',
    sourceCaseId: '11111111-1111-4111-8111-111111111111', durationMinutes: 15 }, get: () => 'test' };
  delete process.env.PLATFORM_BREAK_GLASS_ENABLED;
  const disabled = response();
  await accessController.createBreakGlass(baseReq, disabled);
  assert.equal(disabled.body.error.code, 'BREAK_GLASS_DISABLED');
  process.env.PLATFORM_BREAK_GLASS_ENABLED = 'true';
  process.env.PLATFORM_BREAK_GLASS_MAX_MINUTES = '30';
  let created;
  t.mock.method(models.BreakGlassGrant, 'create', async (values) => { created = values; return { id: 'bg-2', ...values,
    toJSON() { return { id: this.id, expiresAt: this.expiresAt, reason: this.reason }; } }; });
  t.mock.method(models.AuditLog, 'create', async (values) => values);
  const allowed = response();
  await accessController.createBreakGlass(baseReq, allowed);
  assert.equal(allowed.statusCode, 201);
  assert.equal(created.reason, 'incident response');
  assert.equal(created.sourceCaseId, baseReq.body.sourceCaseId);
  assert.ok(new Date(created.expiresAt).getTime() - new Date(created.startsAt).getTime() <= 15 * 60000 + 20);
});

test('P5-ADM-001: recent-auth prerequisite is complemented by MFA-verified session enforcement', async (t) => {
  t.mock.method(models.User, 'findByPk', async () => ({ id: 'operator-1', mfaEnabled: true }));
  t.mock.method(models.UserSession, 'findByPk', async () => ({ id: 'session-1', mfaVerified: false,
    revokedAt: null, expiresAt: new Date(Date.now() + 60000) }));
  const denied = response();
  await platformAuth.requireMfaVerified({ user: { id: 'operator-1', sessionId: 'session-1' } }, denied, () => {});
  assert.equal(denied.statusCode, 403);
  assert.equal(denied.body.error.code, 'MFA_REQUIRED');
});

test('P5-ADM-001: role grant changes revoke affected sessions after approved execution', async (t) => {
  t.mock.method(models.User, 'findByPk', async () => ({ id: 'target-user' }));
  t.mock.method(approvalService, 'consume', async () => ({ id: 'approval-grant' }));
  t.mock.method(models.PlatformRoleGrant, 'create', async (values) => ({ id: 'grant-1', ...values,
    toJSON() { return { id: this.id, userId: this.userId, role: this.role, status: 'active' }; } }));
  let revokedUserId = null;
  t.mock.method(sessionManager, 'revokeAllUserSessions', async (userId) => { revokedUserId = userId; return 2; });
  t.mock.method(models.AuditLog, 'create', async (values) => values);
  const req = { user: { id: 'admin-1' }, body: { userId: 'target-user', role: 'support_agent',
    scopeType: 'platform', reason: 'approved staffing change', approvalRequestId: 'approval-grant' },
  platformAccess: { roles: ['platform_admin'], effectivePermissions: ['platform.role.manage.approve'],
    tenantScope: 'platform/*' }, ip: '127.0.0.1', get: () => 'test' };
  const res = response();
  await accessController.createRoleGrant(req, res);
  assert.equal(res.statusCode, 201);
  assert.equal(revokedUserId, 'target-user');
});

test('P5-ADM-001: audit records are complete and redact credentials and unnecessary PII', async (t) => {
  let saved;
  t.mock.method(models.AuditLog, 'create', async (values) => { saved = values; return values; });
  await emitAuditEvent({ correlationId: 'corr-1', actorUserId: 'actor-1', actorRole: 'seller_reviewer',
    actorRoles: ['seller_reviewer'], effectivePermissions: ['seller.decision.approve'], action: 'TEST_MUTATION',
    resource: 'Store', resourceId: 'store-a', reason: 'case evidence', sourceCaseId: '11111111-1111-4111-8111-111111111111',
    tenantScope: 'store/store-a', approvalRequestId: 'approval-1', breakGlassGrantId: null,
    safeBefore: { status: 'pending', password: 'never-log', email: 'person@example.com' },
    safeAfter: { status: 'approved', token: 'never-log' } });
  for (const field of ['correlationId', 'actorUserId', 'actorRole', 'actorRoles', 'effectivePermissions',
    'action', 'resource', 'resourceId', 'reason', 'sourceCaseId', 'tenantScope', 'approvalRequestId',
    'safeBefore', 'safeAfter']) assert.notEqual(saved[field], undefined, field);
  assert.equal(saved.safeBefore.password, '[REDACTED]');
  assert.equal(saved.safeBefore.email, '[REDACTED]');
  assert.equal(saved.safeAfter.token, '[REDACTED]');
  assert.equal(sanitizeAuditData({ credential: 'x' }).credential, '[REDACTED]');
});

test('P5-ADM-001: migration 016 is additive and rollback removes only its additions', async () => {
  const created = []; const added = []; const removed = []; const dropped = [];
  const qi = { showAllTables: async () => ['Users', 'AuditLogs'], describeTable: async () => ({}),
    createTable: async (name) => created.push(name), addIndex: async () => {},
    addColumn: async (_table, name) => added.push(name), removeColumn: async (_table, name) => removed.push(name),
    dropTable: async (name) => dropped.push(name) };
  await migration.up({ queryInterface: qi });
  assert.deepEqual(created, ['PlatformRoleGrants', 'AdminApprovalRequests', 'BreakGlassGrants']);
  assert.equal(added.includes('safeBefore'), true);
  qi.showAllTables = async () => ['AuditLogs', ...created];
  qi.describeTable = async () => Object.fromEntries(added.map((name) => [name, {}]));
  await migration.down({ queryInterface: qi });
  assert.equal(removed.includes('safeAfter'), true);
  assert.deepEqual(dropped, ['BreakGlassGrants', 'AdminApprovalRequests', 'PlatformRoleGrants']);
});
