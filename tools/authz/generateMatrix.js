// tools/authz/generateMatrix.js
// Generates the authoritative machine-readable Release 1 authorization matrix.

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../..');
function findModule(subPath) {
  const candidates = [
    path.resolve(rootDir, 'ecommerce-server/node_modules', subPath),
    path.resolve(rootDir, 'rentify-server/node_modules', subPath),
    path.resolve(rootDir, 'node_modules', subPath),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

const yaml = require(findModule('yaml'));

const coreSpec = yaml.parse(fs.readFileSync(path.resolve(rootDir, 'docs/openapi/core.openapi.yaml'), 'utf8'));
const commSpec = yaml.parse(fs.readFileSync(path.resolve(rootDir, 'docs/openapi/commerce.openapi.yaml'), 'utf8'));

function categorizeResource(svc, method, p, tag) {
  if (p === '/health' || p === '/ready' || p.startsWith('/ops') || p.startsWith('/api/ops') || p.startsWith('/api/internal')) {
    return 'Operational and reconciliation routes';
  }
  if (p.startsWith('/api/auth') || p.startsWith('/api/user') || p.startsWith('/api/customer')) {
    return 'Identity and sessions';
  }
  if (p.startsWith('/api/staff')) {
    return 'Staff';
  }
  if (p.startsWith('/admin') || p.startsWith('/api/admin')) {
    if (p.includes('template')) return 'Deployments and domains';
    return 'Admin moderation';
  }
  if (p.startsWith('/templates') || p.startsWith('/api/deployments')) {
    return 'Deployments and domains';
  }
  if (p.startsWith('/api/packages') || (svc === 'core' && p.startsWith('/api/payment')) || p.startsWith('/dashboard/subscription')) {
    return 'Packages and subscriptions';
  }
  if (p.includes('/product-images') || p.includes('/uploadImage') || p.includes('/upload-pdf') || p.includes('/logo')) {
    return 'Media';
  }
  if (p.startsWith('/api/websites') || p.startsWith('/api/website-data') || p === '/dashboard/website/current') {
    return 'Websites';
  }
  if (p.startsWith('/api/stores') || p.startsWith('/api/store-access') || p.startsWith('/dashboard')) {
    if (p.includes('/products') || p.includes('/product-imports')) return 'Products and variants';
    if (p.includes('/orders/pos')) return 'POS';
    if (p.includes('/delivery-policy')) return 'Stores';
    if (p.includes('/categories')) return 'Categories';
    return 'Stores';
  }
  if (p.includes('/categories')) {
    return 'Categories';
  }
  if (p.includes('/cart')) {
    return 'Carts';
  }
  if (p.includes('/orders/pos') || p.includes('/pos')) {
    return 'POS';
  }
  if (p.includes('/invoice')) {
    return 'Invoices';
  }
  if (p.includes('/checkout') || p.includes('/payment') || p.includes('/payment-config')) {
    return 'Payments and COD';
  }
  if (p.includes('/reports/complaint') || p.includes('/reviews')) {
    return 'Returns and complaints';
  }
  if (p.includes('/orders') || p.includes('/my-orders')) {
    return 'Orders';
  }
  if (p.includes('/analytics') || p.includes('/stats') || p.includes('/usage')) {
    return 'Usage';
  }
  if (p.includes('/notifications') || p.includes('/telegram')) {
    return 'Notifications';
  }
  if (p.includes('/inventory')) {
    return 'Inventory';
  }
  if (p.includes('/product') || p.includes('/products')) {
    return 'Products and variants';
  }
  return 'Stores';
}

function deriveAction(method, p, operationId) {
  if (method === 'GET') {
    if (p.includes('{') || p.endsWith('/mine') || p.endsWith('/current') || p.endsWith('/overview')) return 'read';
    return 'list';
  }
  if (method === 'POST') {
    if (p.includes('/login') || p.includes('/auth') || p.includes('/session')) return 'authenticate';
    if (p.includes('/publish')) return 'publish';
    if (p.includes('/clear') || p.includes('/sync')) return 'execute';
    if (p.includes('/invite')) return 'invite';
    return 'create';
  }
  if (method === 'PUT' || method === 'PATCH') {
    return 'update';
  }
  if (method === 'DELETE') {
    return 'delete';
  }
  return 'execute';
}

function classifyOperation(svc, method, p, opObj) {
  const opId = opObj.operationId;
  const tag = opObj.tags?.[0] || '';
  const resource = categorizeResource(svc, method, p, tag);
  const action = deriveAction(method, p, opId);
  const security = opObj.security || [];
  const isPublic = security.length === 0 || p === '/health' || p === '/ready' ||
    p.includes('/login') || p.includes('/signup') || p.includes('/otp') ||
    p.includes('/password') || p.includes('/telegram') ||
    (svc === 'commerce' && (p === '/api/marketplace/products' || p.startsWith('/api/marketplace/products/{') || p === '/api/marketplace/categories')) ||
    (svc === 'core' && (p === '/templates' || p.startsWith('/templates/') || p === '/api/stores/public' || p.startsWith('/api/stores/public/')));

  const isInternal = p.startsWith('/api/internal') || p.startsWith('/ops') || p.startsWith('/api/ops') ||
    p.includes('/sync') || security.some(s => s.internalSecretHeader || s.serviceTokenHeader || s.opsTokenHeader);

  let publicOrAuth = 'authenticated';
  if (isInternal) publicOrAuth = 'system_internal';
  else if (isPublic) publicOrAuth = 'public';

  // Determine required role & subject
  let subjectType = 'user';
  let requiredRole = 'merchant';
  let requiredStoreRelationship = 'owner';
  let optionalWebsiteContext = null;
  let requiredPermission = null;
  let requiredEntitlement = null;
  let adminOverridePolicy = 'allow';
  let ownershipRule = 'user.id === store.merchantId';
  let expectedDenialCode = isPublic ? 200 : 401;

  // Actor matrix defaults (Deny by default)
  const actorMatrix = {
    storeOwner: 'deny_403',
    permittedStaff: 'deny_403',
    unpermittedStaff: 'deny_403',
    unrelatedMerchant: 'deny_403',
    resourceBuyer: 'deny_403',
    differentBuyer: 'deny_403',
    publicUser: isPublic ? 'allow' : 'deny_401',
    suspendedActor: 'deny_403',
    platformAdmin: 'deny_403',
    revokedSession: isPublic ? 'allow' : 'deny_401',
    ambiguousMultiRole: 'deny_401',
  };

  // Status and gaps
  let currentImplementationStatus = 'enforced';
  let gapDetails = null;
  let remediationPackage = null;

  if (isPublic) {
    subjectType = 'public';
    requiredRole = null;
    requiredStoreRelationship = 'none';
    ownershipRule = 'public_access';
    expectedDenialCode = 200;
    for (const k of Object.keys(actorMatrix)) {
      actorMatrix[k] = 'allow';
    }
  } else if (isInternal) {
    subjectType = 'system';
    requiredRole = null;
    requiredStoreRelationship = 'none';
    ownershipRule = 'system_credential_required';
    expectedDenialCode = 401;
    actorMatrix.platformAdmin = 'allow';
  } else if (resource === 'Admin moderation') {
    subjectType = 'user';
    requiredRole = 'admin';
    requiredStoreRelationship = 'none';
    ownershipRule = 'user.role === "admin"';
    expectedDenialCode = 403;
    actorMatrix.platformAdmin = 'allow';
  } else if (
    p.includes('/my-orders') ||
    p.includes('/marketplace/cart') ||
    p.includes('/marketplace/checkout') ||
    p.includes('/reviews') ||
    p === '/api/customer' ||
    p.startsWith('/api/customer/')
  ) {
    // Buyer resources
    subjectType = 'user';
    requiredRole = 'buyer';
    requiredStoreRelationship = 'buyer';
    ownershipRule = 'user.id === resource.buyerId';
    expectedDenialCode = 403;
    actorMatrix.resourceBuyer = 'allow';
    actorMatrix.differentBuyer = 'deny_403';
    actorMatrix.storeOwner = 'deny_403';
    actorMatrix.platformAdmin = 'deny_403';
  } else if (p.startsWith('/api/staff')) {
    // Staff routes
    if (p === '/api/staff/me') {
      subjectType = 'staff';
      requiredRole = 'staff';
      requiredStoreRelationship = 'staff_member';
      ownershipRule = 'staff.id === currentSession.staffId';
      actorMatrix.permittedStaff = 'allow';
      actorMatrix.unpermittedStaff = 'allow';
    } else {
      subjectType = 'user';
      requiredRole = 'merchant';
      requiredStoreRelationship = 'owner';
      ownershipRule = 'user.id === store.merchantId';
      actorMatrix.storeOwner = 'allow';
      actorMatrix.permittedStaff = 'deny_403';
    }
  } else if (resource === 'Products and variants' || resource === 'Inventory' || resource === 'Categories') {
    // Merchant & Staff product management
    subjectType = 'any';
    requiredRole = 'merchant';
    requiredStoreRelationship = 'owner';
    requiredPermission = 'products';
    requiredEntitlement = 'active_subscription';
    ownershipRule = 'store.merchantId === user.id || staff.storeId === store.id';
    actorMatrix.storeOwner = 'allow';
    actorMatrix.permittedStaff = 'allow';
    actorMatrix.unpermittedStaff = 'deny_403';
    actorMatrix.platformAdmin = 'allow';

    // Website-scoped compatibility routes resolve the canonical Store and enforce
    // products/manage_products through requireWebsitePermission.
  } else if (resource === 'POS') {
    subjectType = 'any';
    requiredRole = 'merchant';
    requiredStoreRelationship = 'owner';
    requiredPermission = 'orders';
    requiredEntitlement = 'pos_enabled';
    ownershipRule = 'store.merchantId === user.id || staff.storeId === store.id';
    actorMatrix.storeOwner = 'allow';
    actorMatrix.permittedStaff = 'allow';
    actorMatrix.unpermittedStaff = 'deny_403';
    actorMatrix.platformAdmin = 'allow';

    // Website-scoped compatibility routes resolve the canonical Store and enforce
    // the POS permission through requireWebsitePermission.
  } else if (resource === 'Orders' || resource === 'Invoices') {
    if (p.includes('/merchant') || p.includes('/stores/')) {
      subjectType = 'any';
      requiredRole = 'merchant';
      requiredStoreRelationship = 'owner';
      requiredPermission = 'orders';
      ownershipRule = 'store.merchantId === user.id || staff.storeId === store.id';
      actorMatrix.storeOwner = 'allow';
      actorMatrix.permittedStaff = 'allow';
      actorMatrix.unpermittedStaff = 'deny_403';
      actorMatrix.platformAdmin = 'allow';
    } else if (p.includes('/websites/{websiteId}/invoices')) {
      subjectType = 'any';
      requiredRole = 'merchant';
      requiredStoreRelationship = 'owner';
      requiredPermission = 'invoices';
      ownershipRule = 'store.merchantId === user.id || staff.storeId === store.id';
      actorMatrix.storeOwner = 'allow';
      actorMatrix.permittedStaff = 'allow';
      actorMatrix.unpermittedStaff = 'deny_403';
      actorMatrix.platformAdmin = 'allow';
    }
  } else if (resource === 'Websites' || resource === 'Deployments and domains') {
    subjectType = 'user';
    requiredRole = 'merchant';
    requiredStoreRelationship = 'owner';
    ownershipRule = 'website.userId === user.id || store.merchantId === user.id';
    actorMatrix.storeOwner = 'allow';
    actorMatrix.permittedStaff = 'deny_403'; // Only owner can publish or alter website templates
    actorMatrix.platformAdmin = 'allow';
  } else if (resource === 'Packages and subscriptions') {
    subjectType = 'user';
    requiredRole = 'merchant';
    requiredStoreRelationship = 'owner';
    ownershipRule = 'subscription.userId === user.id';
    actorMatrix.storeOwner = 'allow';
    actorMatrix.permittedStaff = 'deny_403';
    actorMatrix.platformAdmin = 'allow';
  } else if (resource === 'Stores') {
    subjectType = 'user';
    requiredRole = 'merchant';
    requiredStoreRelationship = 'owner';
    ownershipRule = 'store.merchantId === user.id';
    actorMatrix.storeOwner = 'allow';
    actorMatrix.permittedStaff = (p.includes('/product-images') || p.includes('/entitlements')) ? 'allow' : 'deny_403';
    actorMatrix.platformAdmin = 'allow';
    if (p.includes('/entitlements')) {
      actorMatrix.suspendedActor = 'allow';
    }
  } else if (resource === 'Media') {
    subjectType = 'any';
    requiredRole = 'merchant';
    requiredStoreRelationship = 'owner';
    requiredPermission = 'products';
    ownershipRule = 'store.merchantId === user.id || staff.storeId === store.id';
    actorMatrix.storeOwner = 'allow';
    actorMatrix.permittedStaff = 'allow';
    actorMatrix.unpermittedStaff = 'deny_403';
    actorMatrix.platformAdmin = 'allow';
  } else if (resource === 'Usage') {
    subjectType = 'user';
    requiredRole = 'merchant';
    requiredStoreRelationship = 'owner';
    ownershipRule = 'usage.storeId === store.id && store.merchantId === user.id';
    actorMatrix.storeOwner = 'allow';
    actorMatrix.platformAdmin = 'allow';

    if (p.startsWith('/ecommerce/stats/websites/{websiteId}')) {
      subjectType = 'any';
      requiredPermission = 'analytics';
      ownershipRule = 'store.merchantId === user.id || staff.storeId === store.id';
      actorMatrix.permittedStaff = 'allow';
      actorMatrix.unpermittedStaff = 'deny_403';
    }
  } else {
    // Default store owner
    subjectType = 'user';
    requiredRole = 'merchant';
    requiredStoreRelationship = 'owner';
    ownershipRule = 'user.id === store.merchantId';
    actorMatrix.storeOwner = 'allow';
  }

  // Ensure suspended actor has read-only or deny behavior
  if (actorMatrix.suspendedActor !== 'allow') {
    if (method === 'GET' && !isPublic && !isInternal) {
      actorMatrix.suspendedActor = 'allow'; // Read-only access per DEC-020
    } else {
      actorMatrix.suspendedActor = 'deny_403';
    }
  }

  return {
    operationId: opId,
    service: svc,
    method,
    path: p,
    resource,
    action,
    summary: opObj.summary || '',
    publicOrAuthenticated: publicOrAuth,
    subjectType,
    requiredRole,
    requiredStoreRelationship,
    optionalWebsiteOrChannelContext: optionalWebsiteContext,
    requiredPermission,
    requiredEntitlement,
    suspendedOrRevokedBehavior: isPublic ? 'allow' : (method === 'GET' ? 'read_only' : 'deny'),
    adminOverridePolicy,
    ownershipRule,
    expectedDenialCode: isPublic ? 200 : (publicOrAuth === 'system_internal' ? 401 : 403),
    actorMatrix,
    currentImplementationStatus,
    gapDetails,
    remediationPackage,
  };
}

function generateMatrix() {
  const operations = [];

  // Core operations
  for (const [p, item] of Object.entries(coreSpec.paths || {})) {
    for (const m of ['get', 'post', 'put', 'patch', 'delete']) {
      if (item[m]) {
        operations.push(classifyOperation('core', m.toUpperCase(), p, item[m]));
      }
    }
  }

  // Commerce operations
  for (const [p, item] of Object.entries(commSpec.paths || {})) {
    for (const m of ['get', 'post', 'put', 'patch', 'delete']) {
      if (item[m]) {
        operations.push(classifyOperation('commerce', m.toUpperCase(), p, item[m]));
      }
    }
  }

  const matrix = {
    $schema: './authorization-matrix.schema.json',
    version: '1.0.0',
    targetRelease: 'Release 1',
    generatedAt: new Date().toISOString(),
    totalOperations: operations.length,
    coreOperationsCount: operations.filter(o => o.service === 'core').length,
    commerceOperationsCount: operations.filter(o => o.service === 'commerce').length,
    defaultPolicy: 'deny',
    actors: {
      storeOwner: {
        description: 'Authenticated merchant owner who owns the target store resource',
        subjectType: 'user',
        role: 'seller',
      },
      permittedStaff: {
        description: 'Authenticated staff member assigned to the target store with required permission',
        subjectType: 'staff',
        role: 'staff',
      },
      unpermittedStaff: {
        description: 'Authenticated staff member assigned to target store but lacking the required permission',
        subjectType: 'staff',
        role: 'staff',
      },
      unrelatedMerchant: {
        description: 'Authenticated merchant owner who owns a different store',
        subjectType: 'user',
        role: 'seller',
      },
      resourceBuyer: {
        description: 'Authenticated buyer who owns the target cart, order, review, or complaint report',
        subjectType: 'user',
        role: 'buyer',
      },
      differentBuyer: {
        description: 'Authenticated buyer attempting to view or alter another buyer\'s private resource',
        subjectType: 'user',
        role: 'buyer',
      },
      publicUser: {
        description: 'Anonymous caller presenting no authentication credentials',
        subjectType: 'public',
        role: null,
      },
      suspendedActor: {
        description: 'Authenticated actor whose account or store is in suspended status',
        subjectType: 'user',
        role: 'suspended',
      },
      platformAdmin: {
        description: 'Authenticated platform operator with administrative role',
        subjectType: 'user',
        role: 'admin',
      },
      revokedSession: {
        description: 'Caller presenting an expired, blacklisted, or rotated session credential',
        subjectType: 'revoked',
        role: null,
      },
      ambiguousMultiRole: {
        description: 'Caller presenting mismatched or conflicting credentials across roles',
        subjectType: 'user',
        role: 'multi',
      },
    },
    operations,
  };

  const outDir = path.resolve(rootDir, 'docs/security');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outFile = path.resolve(outDir, 'authorization-matrix.json');
  fs.writeFileSync(outFile, JSON.stringify(matrix, null, 2), 'utf8');
  console.log(`Generated authorization matrix with ${operations.length} operations at: ${outFile}`);
  return matrix;
}

if (require.main === module) {
  generateMatrix();
}

module.exports = { generateMatrix, classifyOperation };
