// tools/authz/test/authorizationMatrix.test.js
// Table-driven security test suite for Release 1 Authorization Policy Matrix.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '../../..');
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

const {
  loadMatrix,
  getOperation,
  getOperationsByResource,
  getRecordedGaps,
  validateMatrix,
  evaluateMatrixAccess,
  REQUIRED_ACTORS,
  REQUIRED_RESOURCES,
} = require('../index');

test('P2-AUTHZ-001 Acceptance: Matrix schema, operations count, and structural completeness', () => {
  const result = validateMatrix({ throwOnError: false });

  assert.equal(result.valid, true, `Matrix should be valid: ${result.errors.join(', ')}`);
  assert.equal(result.errors.length, 0);
  assert.equal(result.totalOperations, 268, 'Expected exactly 268 operations (116 Core + 152 Commerce)');
  assert.equal(result.coreOperationsCount, 116, 'Core operations count must be 116');
  assert.equal(result.commerceOperationsCount, 152, 'Commerce operations count must be 152');

  // Assert all 11 required actors are defined
  for (const actor of REQUIRED_ACTORS) {
    assert.ok(result.matrix.actors[actor], `Actor "${actor}" must be defined`);
  }

  // Assert all 20 required resources have operations mapped
  for (const res of REQUIRED_RESOURCES) {
    const ops = getOperationsByResource(res);
    assert.ok(ops.length > 0, `Resource "${res}" must have at least one mapped operation`);
  }
});

test('P2-AUTHZ-001 Acceptance: 100% OpenAPI contract coverage (0 unmapped operations)', () => {
  const coreSpecPath = path.resolve(rootDir, 'docs/openapi/core.openapi.yaml');
  const commSpecPath = path.resolve(rootDir, 'docs/openapi/commerce.openapi.yaml');

  const coreSpec = yaml.parse(fs.readFileSync(coreSpecPath, 'utf8'));
  const commSpec = yaml.parse(fs.readFileSync(commSpecPath, 'utf8'));
  const matrix = loadMatrix();

  const matrixOpIds = new Set(matrix.operations.map((o) => o.operationId));

  // Verify Core OpenAPI
  const unmappedCore = [];
  for (const [p, item] of Object.entries(coreSpec.paths || {})) {
    for (const m of ['get', 'post', 'put', 'patch', 'delete']) {
      if (item[m] && !matrixOpIds.has(item[m].operationId)) {
        unmappedCore.push({ method: m.toUpperCase(), path: p, operationId: item[m].operationId });
      }
    }
  }
  assert.equal(unmappedCore.length, 0, `Core operations unmapped: ${JSON.stringify(unmappedCore)}`);

  // Verify Commerce OpenAPI
  const unmappedComm = [];
  for (const [p, item] of Object.entries(commSpec.paths || {})) {
    for (const m of ['get', 'post', 'put', 'patch', 'delete']) {
      if (item[m] && !matrixOpIds.has(item[m].operationId)) {
        unmappedComm.push({ method: m.toUpperCase(), path: p, operationId: item[m].operationId });
      }
    }
  }
  assert.equal(unmappedComm.length, 0, `Commerce operations unmapped: ${JSON.stringify(unmappedComm)}`);
});

test('P2-AUTHZ-001 Acceptance: Deny-by-default behavior', () => {
  // Unknown operation ID must evaluate to deny
  assert.equal(evaluateMatrixAccess('unknown_operation_xyz', 'storeOwner'), 'deny_403');
  // Unknown actor must evaluate to deny
  assert.equal(evaluateMatrixAccess('getOwnStore', 'unknown_actor_role'), 'deny_403');
  // Both unknown
  assert.equal(evaluateMatrixAccess('unknown_op', 'unknown_actor'), 'deny_403');
});

test('P2-AUTHZ-001 Table-Driven Tests: Actor Case 1 — Store Owner', () => {
  const testTable = [
    { opId: 'getOwnStore', expected: 'allow', desc: 'Read own store details' },
    { opId: 'updateOwnStore', expected: 'allow', desc: 'Update own store details' },
    { opId: 'post_api_stores_storeId_products', expected: 'allow', desc: 'Create product in own store' },
    { opId: 'patch_api_stores_storeId_products_productId', expected: 'allow', desc: 'Update product in own store' },
    { opId: 'post_api_stores_storeId_orders_pos', expected: 'allow', desc: 'Create POS order for own store' },
    { opId: 'publishWebsite', expected: 'allow', desc: 'Publish website for own store' },
    { opId: 'sendStaffInvitation', expected: 'allow', desc: 'Invite staff to own store' },
    { opId: 'getAdminOverview', expected: 'deny_403', desc: 'Cannot access platform admin overview' },
    { opId: 'reviewSellerApplication', expected: 'deny_403', desc: 'Cannot review seller KYC applications' },
    { opId: 'get_api_marketplace_my_orders', expected: 'deny_403', desc: 'Cannot read other buyers orders via store owner credentials' },
  ];

  for (const row of testTable) {
    const decision = evaluateMatrixAccess(row.opId, 'storeOwner');
    assert.equal(decision, row.expected, `Store owner on ${row.opId} (${row.desc}) expected ${row.expected}, got ${decision}`);
  }
});

test('P2-AUTHZ-001 Table-Driven Tests: Actor Case 2 & 3 — Permitted vs Unpermitted Staff', () => {
  const testTable = [
    { opId: 'get_api_stores_storeId_products', permitted: 'allow', unpermitted: 'deny_403', desc: 'Catalog viewing with products permission' },
    { opId: 'post_api_stores_storeId_products', permitted: 'allow', unpermitted: 'deny_403', desc: 'Catalog creation with products permission' },
    { opId: 'post_api_stores_storeId_orders_pos', permitted: 'allow', unpermitted: 'deny_403', desc: 'POS order with orders permission' },
    { opId: 'uploadStoreProductImages', permitted: 'allow', unpermitted: 'deny_403', desc: 'Upload product media with products permission' },
    { opId: 'sendStaffInvitation', permitted: 'deny_403', unpermitted: 'deny_403', desc: 'Owner-only: staff cannot invite other staff' },
    { opId: 'publishWebsite', permitted: 'deny_403', unpermitted: 'deny_403', desc: 'Owner-only: staff cannot publish or configure domains' },
    { opId: 'initiateKHQRPayment', permitted: 'deny_403', unpermitted: 'deny_403', desc: 'Owner-only: staff cannot change subscription billing' },
    { opId: 'getStaffProfile', permitted: 'allow', unpermitted: 'allow', desc: 'Self profile: staff can read their own profile (/api/staff/me)' },
  ];

  for (const row of testTable) {
    const permittedDecision = evaluateMatrixAccess(row.opId, 'permittedStaff');
    const unpermittedDecision = evaluateMatrixAccess(row.opId, 'unpermittedStaff');
    assert.equal(permittedDecision, row.permitted, `Permitted staff on ${row.opId} expected ${row.permitted}, got ${permittedDecision}`);
    assert.equal(unpermittedDecision, row.unpermitted, `Unpermitted staff on ${row.opId} expected ${row.unpermitted}, got ${unpermittedDecision}`);
  }
});

test('P2-AUTHZ-001 Table-Driven Tests: Actor Case 4 — Unrelated Merchant', () => {
  const protectedStoreOps = [
    'getOwnStore',
    'updateOwnStore',
    'post_api_stores_storeId_products',
    'patch_api_stores_storeId_products_productId',
    'post_api_stores_storeId_orders_pos',
    'publishWebsite',
    'sendStaffInvitation',
  ];

  for (const opId of protectedStoreOps) {
    const decision = evaluateMatrixAccess(opId, 'unrelatedMerchant');
    assert.equal(decision, 'deny_403', `Unrelated merchant on ${opId} must be denied with deny_403`);
  }
});

test('P2-AUTHZ-001 Table-Driven Tests: Actor Case 5 & 6 — Resource Buyer vs Different Buyer', () => {
  const buyerOps = [
    { opId: 'get_api_marketplace_cart', resourceBuyer: 'allow', differentBuyer: 'deny_403', desc: 'Buyer cart access' },
    { opId: 'post_api_marketplace_cart_items', resourceBuyer: 'allow', differentBuyer: 'deny_403', desc: 'Add item to buyer cart' },
    { opId: 'get_api_marketplace_my_orders', resourceBuyer: 'allow', differentBuyer: 'deny_403', desc: 'Buyer viewing own orders' },
    { opId: 'post_api_marketplace_my_orders_orderId_reports_type', resourceBuyer: 'allow', differentBuyer: 'deny_403', desc: 'File complaint report' },
    { opId: 'get_api_marketplace_my_orders_orderId', resourceBuyer: 'allow', differentBuyer: 'deny_403', desc: 'Buyer viewing specific order' },
    { opId: 'get_api_customer', resourceBuyer: 'allow', differentBuyer: 'deny_403', desc: 'Buyer customer profile' },
  ];

  for (const row of buyerOps) {
    const resBuyer = evaluateMatrixAccess(row.opId, 'resourceBuyer');
    const diffBuyer = evaluateMatrixAccess(row.opId, 'differentBuyer');
    assert.equal(resBuyer, row.resourceBuyer, `Resource buyer on ${row.opId} (${row.desc}) expected ${row.resourceBuyer}, got ${resBuyer}`);
    assert.equal(diffBuyer, row.differentBuyer, `Different buyer on ${row.opId} (${row.desc}) expected ${row.differentBuyer}, got ${diffBuyer}`);
  }
});

test('P2-AUTHZ-001 Table-Driven Tests: Actor Case 7 — Public User', () => {
  const testTable = [
    { opId: 'getHealth', expected: 'allow', desc: 'Liveness health check' },
    { opId: 'getReady', expected: 'allow', desc: 'Readiness probe' },
    { opId: 'get_api_marketplace_products', expected: 'allow', desc: 'Public marketplace product catalog' },
    { opId: 'get_api_marketplace_categories', expected: 'allow', desc: 'Public category hierarchy' },
    { opId: 'listPublicStores', expected: 'allow', desc: 'Public store directory' },
    { opId: 'listPublicTemplates', expected: 'allow', desc: 'Public template catalog' },
    { opId: 'authLogin', expected: 'allow', desc: 'Login endpoint' },
    { opId: 'authSignup', expected: 'allow', desc: 'Signup endpoint' },
    { opId: 'getOwnStore', expected: 'deny_401', desc: 'Merchant store requires auth' },
    { opId: 'post_api_stores_storeId_products', expected: 'deny_401', desc: 'Product creation requires auth' },
    { opId: 'getAdminOverview', expected: 'deny_401', desc: 'Admin overview requires auth' },
  ];

  for (const row of testTable) {
    const decision = evaluateMatrixAccess(row.opId, 'publicUser');
    assert.equal(decision, row.expected, `Public user on ${row.opId} (${row.desc}) expected ${row.expected}, got ${decision}`);
  }
});

test('P2-AUTHZ-001 Table-Driven Tests: Actor Case 8 — Suspended Actor', () => {
  const testTable = [
    { opId: 'getDashboardCurrentWebsite', expected: 'allow', desc: 'Dashboard read allowed (90-day read-only grace DEC-020)' },
    { opId: 'getOwnStore', expected: 'allow', desc: 'Store read allowed for reconciliation' },
    { opId: 'post_api_stores_storeId_products', expected: 'deny_403', desc: 'Product creation mutation denied' },
    { opId: 'publishWebsite', expected: 'deny_403', desc: 'Website publishing mutation denied' },
    { opId: 'sendStaffInvitation', expected: 'deny_403', desc: 'Staff invitation mutation denied' },
    { opId: 'post_api_stores_storeId_orders_pos', expected: 'deny_403', desc: 'POS order mutation denied' },
  ];

  for (const row of testTable) {
    const decision = evaluateMatrixAccess(row.opId, 'suspendedActor');
    assert.equal(decision, row.expected, `Suspended actor on ${row.opId} (${row.desc}) expected ${row.expected}, got ${decision}`);
  }
});

test('P2-AUTHZ-001 Table-Driven Tests: Actor Case 9 — Platform Administrator', () => {
  const adminOps = [
    { opId: 'getAdminOverview', expected: 'allow', desc: 'Platform admin dashboard overview' },
    { opId: 'listAdminResource', expected: 'allow', desc: 'Platform admin resource inspection' },
    { opId: 'createAdminTemplate', expected: 'allow', desc: 'Admin template publishing' },
    { opId: 'reviewSellerApplication', expected: 'allow', desc: 'Seller KYC application review' },
    { opId: 'patch_api_admin_operations_products_id', expected: 'allow', desc: 'Delist violating product' },
    { opId: 'patch_api_admin_operations_reviews_id', expected: 'allow', desc: 'Moderate abusive review' },
    { opId: 'get_api_marketplace_my_orders', expected: 'deny_403', desc: 'Admin cannot impersonate buyer private orders without audit session' },
  ];

  for (const row of adminOps) {
    const decision = evaluateMatrixAccess(row.opId, 'platformAdmin');
    assert.equal(decision, row.expected, `Platform admin on ${row.opId} (${row.desc}) expected ${row.expected}, got ${decision}`);
  }
});

test('P2-AUTHZ-001 Table-Driven Tests: Actor Case 10 & 11 — Revoked Session & Ambiguous Multi-Role', () => {
  const protectedOps = [
    'getOwnStore',
    'post_api_stores_storeId_products',
    'get_api_marketplace_my_orders',
    'getAdminOverview',
  ];

  for (const opId of protectedOps) {
    assert.equal(evaluateMatrixAccess(opId, 'revokedSession'), 'deny_401', `Revoked session on ${opId} must yield deny_401`);
    assert.equal(evaluateMatrixAccess(opId, 'ambiguousMultiRole'), 'deny_401', `Ambiguous multi-role conflicting credentials on ${opId} must yield deny_401`);
  }
});

test('P2-AUTHZ-001 Discovered Gaps Tracking: All 14 authorization gaps properly recorded', () => {
  const gaps = getRecordedGaps();
  assert.equal(gaps.length, 14, `Expected exactly 14 recorded authorization gaps, got ${gaps.length}`);

  for (const gap of gaps) {
    assert.equal(gap.currentImplementationStatus, 'gap');
    assert.ok(gap.gapDetails && gap.gapDetails.length > 10, `Gap ${gap.operationId} must have meaningful gapDetails`);
    assert.equal(gap.remediationPackage, 'P2-AUTHZ-002', `Gap ${gap.operationId} must target P2-AUTHZ-002`);
  }
});
