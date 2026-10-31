const test = require('node:test');
const assert = require('node:assert/strict');
const { buildChecklist } = require('../../src/modules/stores/launchChecklistService');

const store = {
  id: 'store-1', name: 'Lotus Shop', status: 'active', primaryCategory: 'Fashion',
  needsCategoryReview: false, marketplaceEnabled: true,
  marketplaceApprovalStatus: 'approved', projectionVersion: 3,
};
const owner = { isVerified: true, email: 'merchant@example.test' };
const commerceFacts = {
  storeProjectionVersion: 3, deliveryPolicyConfigured: true,
  hasValidProduct: true, hasValidSku: true, marketplaceProductReady: true,
};
const application = null;

const byId = (result, id) => result.items.find((entry) => entry.id === id);

test('marketplace-only checklist has no application or review items and omits storefront tasks', () => {
  const result = buildChecklist({ store, owner, website: null, application, commerceFacts });
  assert.equal(result.version, 2);
  assert.equal(result.merchantPath, 'marketplace');
  assert.equal(result.stale, false);
  for (const removed of ['seller_application', 'approval', 'return_policy']) {
    assert.equal(byId(result, removed), undefined, removed);
  }
  assert.equal(byId(result, 'storefront_readiness'), undefined);
  assert.equal(byId(result, 'publication_storefront'), undefined);
});

test('storefront checklist reports channel-specific customization and publication blockers', () => {
  const website = { id: 'website-1', templateId: 'template-1', status: 'customization' };
  const result = buildChecklist({ store, owner, website, application, commerceFacts });
  assert.equal(result.merchantPath, 'storefront');
  assert.equal(byId(result, 'storefront_readiness').status, 'incomplete');
  assert.equal(byId(result, 'storefront_readiness').reasonCode, 'STOREFRONT_CUSTOMIZATION_REQUIRED');
  assert.equal(byId(result, 'publication_storefront').status, 'blocked');
  assert.equal(byId(result, 'publication_storefront').nextAction.code, 'CUSTOMIZE_STOREFRONT');
});

test('missing SKU blocks preview and publication with exact next actions', () => {
  const result = buildChecklist({
    store, owner, website: null, application: null,
    commerceFacts: { ...commerceFacts, hasValidSku: false },
  });
  assert.deepEqual(byId(result, 'first_product_sku'), {
    id: 'first_product_sku', status: 'incomplete', reasonCode: 'VALID_SKU_REQUIRED',
    nextAction: { code: 'ADD_SKU' }, detail: null,
  });
  assert.equal(byId(result, 'preview').status, 'blocked');
  assert.equal(byId(result, 'publication_marketplace').status, 'blocked');
  assert.equal(byId(result, 'publication_marketplace').nextAction.code, 'ADD_SKU');
});

test('delivery fee is complete once set, without any seller application', () => {
  const result = buildChecklist({ store, owner, website: null, application: null, commerceFacts });
  assert.equal(byId(result, 'delivery_policy').status, 'complete');
});

test('a missing delivery fee blocks marketplace publication with a fee action', () => {
  const result = buildChecklist({
    store, owner, website: null, application: null,
    commerceFacts: { ...commerceFacts, deliveryPolicyConfigured: false },
  });
  assert.equal(byId(result, 'delivery_policy').status, 'incomplete');
  assert.equal(byId(result, 'delivery_policy').nextAction.code, 'SET_DELIVERY_FEE');
  assert.equal(byId(result, 'publication_marketplace').reasonCode, 'DELIVERY_POLICY_REQUIRED');
  assert.equal(byId(result, 'publication_marketplace').nextAction.code, 'SET_DELIVERY_FEE');
});

test('a pending Store points at the automatic-listing requirement it is missing', () => {
  const result = buildChecklist({
    store: { ...store, marketplaceApprovalStatus: 'pending', needsCategoryReview: true },
    owner, website: null, application: null, commerceFacts,
  });
  assert.equal(byId(result, 'publication_marketplace').status, 'blocked');
  assert.equal(byId(result, 'publication_marketplace').reasonCode, 'LISTING_REQUIREMENTS_MISSING');
  assert.equal(byId(result, 'publication_marketplace').nextAction.code, 'SET_PRIMARY_CATEGORY');
});

test('unavailable Commerce facts mark dependent items stale and retryable', () => {
  const result = buildChecklist({
    store, owner, website: null, application,
    commerceFacts: null, commerceReasonCode: 'COMMERCE_FACTS_TIMEOUT',
  });
  assert.equal(result.stale, true);
  assert.equal(result.staleReasonCode, 'COMMERCE_FACTS_TIMEOUT');
  assert.equal(byId(result, 'delivery_policy').status, 'blocked');
  assert.equal(byId(result, 'delivery_policy').nextAction.code, 'RETRY_CHECKLIST');
  assert.equal(byId(result, 'first_product_sku').reasonCode, 'COMMERCE_FACTS_TIMEOUT');
});

test('listed ready Store reports marketplace publication complete', () => {
  const result = buildChecklist({ store, owner, website: null, application: null, commerceFacts });
  assert.equal(byId(result, 'publication_marketplace').status, 'complete');
  assert.equal(result.summary.completeCount, result.summary.totalCount);
});

test('admin moderation outcomes expose safe reasons and a support action', () => {
  const result = buildChecklist({
    store: { ...store, marketplaceApprovalStatus: 'needs_changes' }, owner,
    website: { id: 'website-1', templateId: 'template-1', status: 'failed' },
    application: { status: 'needs_changes', reviewReason: 'Add a clearer pickup location.' },
    commerceFacts: { ...commerceFacts, hasValidSku: false },
  });
  const statuses = new Set(result.items.map((entry) => entry.status));
  assert.deepEqual([...statuses].sort(), ['blocked', 'complete', 'failed', 'incomplete'].sort());
  assert.equal(byId(result, 'publication_marketplace').reasonCode, 'MARKETPLACE_LISTING_REMOVED');
  assert.equal(byId(result, 'publication_marketplace').nextAction.code, 'CONTACT_SUPPORT');
  assert.equal(byId(result, 'publication_marketplace').detail, 'Add a clearer pickup location.');
  assert.equal(byId(result, 'storefront_readiness').nextAction.code, 'REVIEW_STOREFRONT');
  assert.equal(byId(result, 'publication_storefront').status, 'failed');

  const suspended = buildChecklist({
    store: { ...store, marketplaceApprovalStatus: 'suspended' }, owner, website: null,
    application: { reviewReason: 'Repeated undelivered orders.' }, commerceFacts,
  });
  assert.equal(byId(suspended, 'publication_marketplace').reasonCode, 'SELLER_SUSPENDED');
});
