const test = require('node:test');
const assert = require('node:assert/strict');
const { createRequireStoreAccess } = require('../../middlewares/requireStoreAccess');

const store = {
  storeId: 'store-1', ownerUserId: 'merchant-1', websiteId: 'website-1', status: 'active',
};

const response = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test('Store access permits the owner and rejects another merchant', async () => {
  const middleware = createRequireStoreAccess({ findStore: async () => store });
  const own = { params: { storeId: store.storeId }, user: { id: 'merchant-1', type: 'user' } };
  let called = false;
  await middleware(own, response(), () => { called = true; });
  assert.equal(called, true);
  assert.equal(own.store, store);

  const other = { params: { storeId: store.storeId }, user: { id: 'merchant-2', type: 'user' } };
  const denied = response();
  await middleware(other, denied, () => { throw new Error('unexpected access'); });
  assert.equal(denied.statusCode, 403);
});

test('Store staff access requires matching merchant, Website and permission', async () => {
  const middleware = createRequireStoreAccess({
    findStore: async () => store,
    permissions: ['manage_products'],
  });
  const staff = {
    type: 'staff', merchantId: 'merchant-1', websiteId: 'website-1',
    permissions: ['manage_products'],
  };
  let called = false;
  await middleware({ params: { storeId: store.storeId }, user: staff }, response(), () => { called = true; });
  assert.equal(called, true);

  for (const invalid of [
    { ...staff, merchantId: 'merchant-2' },
    { ...staff, websiteId: 'website-2' },
    { ...staff, permissions: [] },
  ]) {
    const denied = response();
    await middleware({ params: { storeId: store.storeId }, user: invalid }, denied, () => {
      throw new Error('unexpected access');
    });
    assert.equal(denied.statusCode, 403);
  }
});

test('buyers cannot use merchant Store routes', async () => {
  const middleware = createRequireStoreAccess({ findStore: async () => store });
  const denied = response();
  await middleware({ params: { storeId: store.storeId }, user: { type: 'customer' } }, denied, () => {
    throw new Error('unexpected access');
  });
  assert.equal(denied.statusCode, 401);
});
