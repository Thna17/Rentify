const test = require('node:test');
const assert = require('node:assert/strict');
const { Store, User, Website } = require('../../src/models');
const storeService = require('../../src/services/storeService');
const storeSyncService = require('../../src/services/storeSyncService');

test('marketplace-only Store defaults to marketplace enabled and needs approval', async (t) => {
  const transaction = {};
  const created = [];
  t.mock.method(Store, 'findOne', async () => null);
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
  const store = { id: 'store-1' };
  t.mock.method(Store, 'findOne', async () => store);
  t.mock.method(Store, 'create', async () => { throw new Error('unexpected duplicate Store'); });
  assert.equal(await storeService.ensureForWebsite({ ownerUserId: 'owner-1', businessData: { name: 'Shop' } }), store);
});
