const test = require('node:test');
const assert = require('node:assert/strict');
const { buildChecklist } = require('../../src/modules/stores/launchChecklistService');

const store = {
  id: 'store-1', name: 'Lotus Shop', status: 'active', primaryCategory: 'Fashion',
  needsCategoryReview: false, marketplaceEnabled: true,
  marketplaceApprovalStatus: 'pending', projectionVersion: 3,
};
const owner = { isVerified: true, email: 'merchant@example.test' };
const commerceFacts = {
  storeProjectionVersion: 3, deliveryPolicyConfigured: true,
  hasValidProduct: true, hasValidSku: true, marketplaceProductReady: true,
};
const application = {
  status: 'pending', acceptsDeliveryResponsibility: true,
  acceptsReturnsResponsibility: true, acceptsRefundResponsibility: true,
};

const byId = (result, id) => result.items.find((entry) => entry.id === id);

test('marketplace-only checklist omits storefront tasks and reports pending review honestly', () => {
  const result = buildChecklist({ store, owner, website: null, application, commerceFacts });
  assert.equal(result.merchantPath, 'marketplace');
  assert.equal(result.stale, false);
  assert.equal(byId(result, 'seller_application').status, 'pending');
  assert.equal(byId(result, 'approval').status, 'pending');
  assert.equal(byId(result, 'publication_marketplace').status, 'pending');
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

test('missing SKU blocks application, preview, and publication with exact next actions', () => {
  const result = buildChecklist({
    store, owner, website: null, application: null,
    commerceFacts: { ...commerceFacts, hasValidSku: false },
  });
  assert.deepEqual(byId(result, 'first_product_sku'), {
    id: 'first_product_sku', status: 'incomplete', reasonCode: 'VALID_SKU_REQUIRED',
    nextAction: { code: 'ADD_SKU' }, detail: null,
  });
  assert.equal(byId(result, 'seller_application').status, 'blocked');
  assert.equal(byId(result, 'preview').status, 'blocked');
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

test('approved ready Store reports marketplace publication complete', () => {
  const result = buildChecklist({
    store: { ...store, marketplaceApprovalStatus: 'approved' }, owner,
    website: null, application: { ...application, status: 'approved' }, commerceFacts,
  });
  assert.equal(byId(result, 'approval').status, 'complete');
  assert.equal(byId(result, 'publication_marketplace').status, 'complete');
  assert.equal(result.summary.completeCount, result.summary.totalCount);
});

test('failed review outcomes expose safe reasons and recovery actions', () => {
  const result = buildChecklist({
    store: { ...store, marketplaceApprovalStatus: 'needs_changes' }, owner,
    website: { id: 'website-1', templateId: 'template-1', status: 'failed' },
    application: { ...application, status: 'needs_changes', reviewReason: 'Add a clearer pickup location.' },
    commerceFacts: { ...commerceFacts, hasValidSku: false },
  });
  const statuses = new Set(result.items.map((entry) => entry.status));
  assert.deepEqual([...statuses].sort(), ['blocked', 'complete', 'failed', 'incomplete'].sort());
  assert.equal(byId(result, 'seller_application').nextAction.code, 'UPDATE_APPLICATION');
  assert.equal(byId(result, 'storefront_readiness').nextAction.code, 'REVIEW_STOREFRONT');
  assert.equal(byId(result, 'publication_storefront').status, 'failed');
});
