const test = require('node:test');
const assert = require('node:assert/strict');
const { Store, User, Website, Staff } = require('../../src/models');
const storeService = require('../../src/modules/stores/storeService');
const storeSyncService = require('../../src/modules/commerce-sync/storeSyncService');

test('public Store lookup returns only approved profile fields', async (t) => {
  const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  t.mock.method(Store, 'findAll', async (options) => {
    assert.equal(options.where.status, 'active');
    assert.equal(options.where.marketplaceApprovalStatus, 'approved');
    assert.equal(options.where.marketplaceEntitlement, 'pilot');
    assert.equal(options.where.needsCategoryReview, false);
    assert.deepEqual(options.attributes, ['id', 'name', 'slug', 'primaryCategory', 'logoUrl']);
    return [{ id, name: 'Public Store' }];
  });
  assert.deepEqual(await storeService.listPublicStores(`${id},${id}`), [{ id, name: 'Public Store' }]);
  await assert.rejects(storeService.listPublicStores('bad-id'), { statusCode: 400 });
  assert.deepEqual(await storeService.listPublicStores(''), []);
  t.mock.method(Store, 'findOne', async (options) => {
    assert.equal(options.where.id, id);
    assert.deepEqual(options.attributes, ['id', 'name', 'slug', 'primaryCategory', 'logoUrl']);
    return { id, name: 'Public Store' };
  });
  assert.deepEqual(await storeService.getPublicStore(id), { id, name: 'Public Store' });
  assert.equal(await storeService.getPublicStore('bad-id'), null);
});

test('marketplace-only Store defaults to marketplace enabled and needs approval', async (t) => {
  const transaction = {};
  const created = [];
  t.mock.method(Store, 'findOne', async () => null);
  t.mock.method(Staff, 'findByPk', async () => null);
  t.mock.method(Store.sequelize, 'transaction', async (callback) => callback(transaction));
  t.mock.method(User, 'findByPk', async () => ({ id: 'owner-1' }));
  t.mock.method(Store, 'create', async (data, options) => {
    assert.equal(options.transaction, transaction);
    created.push(data);
    return data;
  });
  t.mock.method(storeSyncService, 'queueStore', async (store, options) => {
    assert.equal(store.ownerUserId, 'owner-1');
    assert.equal(options.transaction, transaction);
  });
  const result = await storeService.createMarketplaceStore({
    ownerUserId: 'owner-1', name: 'My Shop', primaryCategory: 'Fashion',
  });
  assert.equal(result.created, true);
  assert.equal(created[0].marketplaceEnabled, true);
  assert.equal(created[0].marketplaceApprovalStatus, 'pending');
  assert.equal(created[0].primaryCategory, 'Fashion');
});

test('merchant can opt out of marketplace without losing the Store', async (t) => {
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  const store = {
    id: 'store-1', marketplaceEnabled: true, projectionVersion: 1,
    async update(changes) { Object.assign(this, changes); },
  };
  t.mock.method(Store.sequelize, 'transaction', async (callback) => callback(transaction));
  t.mock.method(Store, 'findOne', async () => store);
  t.mock.method(User, 'findByPk', async () => ({ id: 'owner-1', isVerified: false }));
  t.mock.method(Website, 'findOne', async () => null);
  t.mock.method(storeSyncService, 'queueStore', async (updated, options) => {
    assert.equal(updated.marketplaceEnabled, false);
    assert.equal(options.transaction, transaction);
  });
  const result = await storeService.updateOwnStore({
    ownerUserId: 'owner-1', marketplaceEnabled: false,
  });
  assert.equal(result, store);
  assert.equal(result.marketplaceEnabled, false);
  assert.equal(result.projectionVersion, 2);
});

test('website creation reuses a marketplace-only Store', async (t) => {
  const store = { id: 'store-1', primaryCategory: 'Fashion', needsCategoryReview: false };
  t.mock.method(Store, 'findOne', async () => store);
  t.mock.method(Store, 'create', async () => { throw new Error('unexpected duplicate Store'); });
  assert.equal(await storeService.ensureForWebsite({ ownerUserId: 'owner-1', businessData: { name: 'Shop', primaryCategory: 'Fashion' } }), store);
});

test('development approval requires a verified contact and reviewed category', async () => {
  const beforeNodeEnv = process.env.NODE_ENV;
  const beforeApproval = process.env.DEV_MARKETPLACE_AUTO_APPROVAL;
  try {
    process.env.NODE_ENV = 'development';
    process.env.DEV_MARKETPLACE_AUTO_APPROVAL = 'true';
    const store = { status: 'active', marketplaceApprovalStatus: 'pending',
      primaryCategory: 'Fashion', needsCategoryReview: false };
    const owner = { isVerified: true, email: 'merchant@example.com' };
    assert.equal(storeService.eligibleForDevelopmentApproval(store, owner), true);
    assert.equal(storeService.eligibleForDevelopmentApproval({ ...store, needsCategoryReview: true }, owner), false);
    assert.equal(storeService.eligibleForDevelopmentApproval(store, { ...owner, isVerified: false }), false);
    assert.equal(storeService.eligibleForDevelopmentApproval({ ...store, marketplaceApprovalStatus: 'suspended' }, owner), false);
    process.env.NODE_ENV = 'production';
    assert.equal(storeService.eligibleForDevelopmentApproval(store, owner), false);
  } finally {
    if (beforeNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = beforeNodeEnv;
    if (beforeApproval === undefined) delete process.env.DEV_MARKETPLACE_AUTO_APPROVAL;
    else process.env.DEV_MARKETPLACE_AUTO_APPROVAL = beforeApproval;
  }
});

test('choosing a category approves a verified pending Store and queues its projection in development', async (t) => {
  const beforeNodeEnv = process.env.NODE_ENV;
  const beforeApproval = process.env.DEV_MARKETPLACE_AUTO_APPROVAL;
  process.env.NODE_ENV = 'development';
  process.env.DEV_MARKETPLACE_AUTO_APPROVAL = 'true';
  t.after(() => {
    if (beforeNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = beforeNodeEnv;
    if (beforeApproval === undefined) delete process.env.DEV_MARKETPLACE_AUTO_APPROVAL;
    else process.env.DEV_MARKETPLACE_AUTO_APPROVAL = beforeApproval;
  });
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  const store = {
    id: 'store-1', status: 'active', marketplaceApprovalStatus: 'pending',
    primaryCategory: null, needsCategoryReview: true, projectionVersion: 1,
    async update(changes) { Object.assign(this, changes); },
  };
  t.mock.method(Store.sequelize, 'transaction', async (callback) => callback(transaction));
  t.mock.method(Store, 'findOne', async () => store);
  t.mock.method(User, 'findByPk', async () => ({ isVerified: true, email: 'merchant@example.com' }));
  t.mock.method(Website, 'findOne', async () => ({ id: 'website-1' }));
  t.mock.method(storeSyncService, 'queueStore', async (updated, options) => {
    assert.equal(updated.marketplaceApprovalStatus, 'approved');
    assert.equal(options.websiteId, 'website-1');
    assert.equal(options.transaction, transaction);
  });
  const result = await storeService.updateOwnStore({ ownerUserId: 'owner-1', primaryCategory: 'Fashion' });
  assert.equal(result.primaryCategory, 'Fashion');
  assert.equal(result.needsCategoryReview, false);
  assert.equal(result.marketplaceApprovalStatus, 'approved');
  assert.equal(result.projectionVersion, 2);
});
