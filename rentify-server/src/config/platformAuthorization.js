const PLATFORM_ROLES = Object.freeze({
  SUPPORT_AGENT: 'support_agent',
  SELLER_REVIEWER: 'seller_reviewer',
  CATALOG_MODERATOR: 'catalog_moderator',
  FINANCE_RECONCILIATION: 'finance_reconciliation',
  PLATFORM_ADMIN: 'platform_admin',
});

const rolePermissions = {
  [PLATFORM_ROLES.SUPPORT_AGENT]: Object.freeze([
    'support.case.read', 'support.case.create', 'support.case.update',
    'support.case.assign', 'support.case.escalate', 'support.case.resolve',
    'support.case.reopen', 'support.note.create', 'support.attachment.create',
    'support.attachment.read', 'support.communication.send',
  ]),
  [PLATFORM_ROLES.SELLER_REVIEWER]: Object.freeze([
    'seller.application.read', 'seller.decision.propose', 'seller.decision.approve',
    'seller.store.suspend.propose', 'seller.store.suspend.approve', 'seller.audit.read',
  ]),
  [PLATFORM_ROLES.CATALOG_MODERATOR]: Object.freeze([
    'catalog.product.read', 'catalog.product.hold', 'catalog.product.reject.propose',
    'catalog.product.reject.approve', 'catalog.product.restore', 'catalog.appeal.read',
    'catalog.appeal.decide', 'catalog.audit.read',
  ]),
  [PLATFORM_ROLES.FINANCE_RECONCILIATION]: Object.freeze([
    'finance.subscription.read', 'finance.subscription.transition.propose',
    'finance.subscription.transition.approve', 'finance.payment.read',
    'finance.reconciliation.run', 'finance.reconciliation.repair.propose',
    'finance.reconciliation.repair.approve', 'finance.export.sensitive.propose',
    'finance.export.sensitive.approve', 'finance.audit.read',
  ]),
};

const ADMIN_ONLY_PERMISSIONS = Object.freeze([
  'platform.identity.read', 'platform.identity.change.propose',
  'platform.identity.change.approve', 'platform.role.read',
  'platform.role.manage.propose', 'platform.role.manage.approve',
  'platform.session.revoke', 'platform.audit.read', 'platform.break_glass.use',
  'notification.template.read', 'notification.template.manage',
  'notification.delivery.read', 'notification.delivery.retry',
  'notification.preference.read', 'notification.preference.manage',
]);

const ALL_PLATFORM_PERMISSIONS = Object.freeze(Array.from(new Set([
  ...Object.values(rolePermissions).flat(),
  ...ADMIN_ONLY_PERMISSIONS,
])));

rolePermissions[PLATFORM_ROLES.PLATFORM_ADMIN] = ALL_PLATFORM_PERMISSIONS;
const ROLE_PERMISSIONS = Object.freeze(Object.fromEntries(
  Object.entries(rolePermissions).map(([role, permissions]) => [role, Object.freeze([...permissions])])
));

const APPROVAL_ACTIONS = Object.freeze({
  SELLER_SUSPEND: Object.freeze({
    action: 'seller.store.suspend',
    proposePermission: 'seller.store.suspend.propose',
    approvePermission: 'seller.store.suspend.approve',
  }),
  SELLER_REJECT: Object.freeze({
    action: 'seller.decision.reject',
    proposePermission: 'seller.decision.propose',
    approvePermission: 'seller.decision.approve',
  }),
  PLATFORM_ROLE_CHANGE: Object.freeze({
    action: 'platform.role.change',
    proposePermission: 'platform.role.manage.propose',
    approvePermission: 'platform.role.manage.approve',
  }),
  PLATFORM_IDENTITY_CHANGE: Object.freeze({
    action: 'platform.identity.change',
    proposePermission: 'platform.identity.change.propose',
    approvePermission: 'platform.identity.change.approve',
  }),
  STORE_CLOSE: Object.freeze({
    action: 'platform.store.close',
    proposePermission: 'platform.role.manage.propose',
    approvePermission: 'platform.role.manage.approve',
  }),
});

const APPROVAL_ACTION_BY_NAME = Object.freeze(Object.fromEntries(
  Object.values(APPROVAL_ACTIONS).map((entry) => [entry.action, entry])
));

const BREAK_GLASS_DENIED_PERMISSIONS = Object.freeze(new Set([
  'platform.break_glass.use',
  'platform.role.manage.approve',
  'platform.identity.change.approve',
  'seller.store.suspend.approve',
  'seller.decision.approve',
  'catalog.product.reject.approve',
  'finance.subscription.transition.approve',
  'finance.reconciliation.repair.approve',
  'finance.export.sensitive.approve',
]));

const SCOPE_TYPES = Object.freeze(['platform', 'store', 'case', 'queue', 'finance']);

function permissionsForRole(role) {
  return ROLE_PERMISSIONS[role] ? [...ROLE_PERMISSIONS[role]] : [];
}

function isKnownPermission(permission) {
  return ALL_PLATFORM_PERMISSIONS.includes(permission);
}

function permissionForStoreUpdate(body = {}) {
  const suspension = body.status === 'suspended' || body.marketplaceApprovalStatus === 'suspended';
  const onlySuspension = (body.status === undefined || body.status === 'suspended')
    && (body.marketplaceApprovalStatus === undefined || body.marketplaceApprovalStatus === 'suspended')
    && (body.marketplaceEnabled === undefined || body.marketplaceEnabled === false);
  return suspension && onlySuspension ? 'seller.store.suspend.approve' : 'platform.role.manage.approve';
}

module.exports = {
  PLATFORM_ROLES,
  ROLE_PERMISSIONS,
  ALL_PLATFORM_PERMISSIONS,
  APPROVAL_ACTIONS,
  APPROVAL_ACTION_BY_NAME,
  BREAK_GLASS_DENIED_PERMISSIONS,
  SCOPE_TYPES,
  permissionsForRole,
  isKnownPermission,
  permissionForStoreUpdate,
};
