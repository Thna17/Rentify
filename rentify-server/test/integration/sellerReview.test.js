const test = require('node:test');
const assert = require('node:assert/strict');
const { Store, Website, User, SellerApplication, SellerReview } = require('../../src/models');
const storeSyncService = require('../../src/modules/commerce-sync/storeSyncService');
const sellerReviewService = require('../../src/modules/stores/sellerReviewService');

const applicationInput = {
  responsibleName: 'Owner', pickupLocation: 'Market Street',
  buyerContact: '+85512345678', sampleProductDescription: 'Cotton shirt, $10, stock 5',
  acceptsDeliveryResponsibility: true, acceptsCodResponsibility: true,
  acceptsReturnsResponsibility: true, acceptsRefundResponsibility: true,
};
const checklist = Object.fromEntries(sellerReviewService.checklistKeys.map((key) => [key, true]));

function mockTransaction(t) {
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  t.mock.method(Store.sequelize, 'transaction', async (callback) => callback(transaction));
  return transaction;
}

test('seller submission queues pending approval and keeps a marketplace-only Store', async (t) => {
  const transaction = mockTransaction(t);
  const store = {
    id: 'store-1', ownerUserId: 'merchant-1', status: 'active',
    primaryCategory: 'Fashion', needsCategoryReview: false,
    marketplaceApprovalStatus: 'needs_changes', projectionVersion: 2,
    async update(changes) { Object.assign(this, changes); },
  };
  t.mock.method(Store, 'findOne', async () => store);
  t.mock.method(SellerApplication, 'findByPk', async () => null);
  t.mock.method(SellerApplication, 'create', async (data, options) => {
    assert.equal(options.transaction, transaction);
    return data;
  });
  t.mock.method(Website, 'findOne', async () => null);
  t.mock.method(storeSyncService, 'queueStore', async (updated, options) => {
    assert.equal(updated.marketplaceApprovalStatus, 'pending');
    assert.equal(options.websiteId, null);
    assert.equal(options.transaction, transaction);
  });
  const application = await sellerReviewService.submit('merchant-1', applicationInput);
  assert.equal(application.storeId, store.id);
  assert.equal(store.projectionVersion, 3);
});

test('approval requires every checklist item and verified merchant contact', async (t) => {
  const transaction = mockTransaction(t);
  const store = {
    id: 'store-1', ownerUserId: 'merchant-1', primaryCategory: 'Fashion',
    needsCategoryReview: false, projectionVersion: 2,
    async update(changes) { Object.assign(this, changes); },
  };
  const application = {
    async update(changes) { Object.assign(this, changes); return this; },
  };
  t.mock.method(Store, 'findByPk', async () => store);
  t.mock.method(SellerApplication, 'findByPk', async () => application);
  t.mock.method(User, 'findByPk', async () => ({ isVerified: true, email: 'merchant@example.com' }));
  t.mock.method(SellerReview, 'create', async (data, options) => {
    assert.equal(options.transaction, transaction);
    return data;
  });
  t.mock.method(Website, 'findOne', async () => null);
  t.mock.method(storeSyncService, 'queueStore', async (updated) => {
    assert.equal(updated.marketplaceApprovalStatus, 'approved');
  });

  await assert.rejects(() => sellerReviewService.review({
    storeId: store.id, reviewerUserId: 'admin-1', decision: 'approved',
    checklist: { ...checklist, identityReviewed: false },
  }), /Every approval check must pass/);
  const result = await sellerReviewService.review({
    storeId: store.id, reviewerUserId: 'admin-1', decision: 'approved', checklist,
  });
  assert.equal(result.store.marketplaceApprovalStatus, 'approved');
  assert.equal(result.application.status, 'approved');
  assert.equal(result.audit.reviewerUserId, 'admin-1');
  assert.equal(store.projectionVersion, 3);
});

test('suspended sellers cannot reset themselves to pending', async (t) => {
  mockTransaction(t);
  t.mock.method(Store, 'findOne', async () => ({
    status: 'active', marketplaceApprovalStatus: 'suspended',
  }));
  await assert.rejects(() => sellerReviewService.submit('merchant-1', applicationInput),
    /Seller is suspended/);
});
