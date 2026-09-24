const test = require('node:test');
const assert = require('node:assert/strict');
const { createVerifyCoreBuyer, createVerifyStoreActor } = require('../../middlewares/authMiddleware');

const response = () => ({
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
  cookie(name, value, options) { this.cookieSet = { name, value, options }; return this; },
});

test('marketplace buyer auth ignores legacy Customer and staff cookies', async () => {
  let submitted;
  const middleware = createVerifyCoreBuyer({ validate: async (access, refresh) => {
    submitted = { access, refresh };
    return { data: { valid: true, entity: { id: 'core-buyer', isVerified: true },
      newAccessToken: 'rotated-token' } };
  } });
  const req = { cookies: { customerAccessToken: 'legacy-customer',
    staffAccessToken: 'staff', userAccessToken: 'core-token', userRefreshToken: 'refresh' } };
  const res = response();
  let nextCalled = false;
  await middleware(req, res, () => { nextCalled = true; });
  assert.deepEqual(submitted, { access: 'core-token', refresh: 'refresh' });
  assert.equal(req.user.id, 'core-buyer');
  assert.equal(req.user.type, 'user');
  assert.equal(res.cookieSet.name, 'userAccessToken');
  assert.equal(res.cookieSet.options.httpOnly, true);
  assert.equal(nextCalled, true);
});

test('marketplace buyer auth never falls back to a Customer cookie', async () => {
  const middleware = createVerifyCoreBuyer({ validate: async () => {
    assert.fail('Core must not be contacted without a Core cookie');
  } });
  const res = response();
  let nextCalled = false;
  await middleware({ cookies: { customerAccessToken: 'legacy-customer' } }, res,
    () => { nextCalled = true; });
  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test('marketplace buyer auth rejects invalid or unavailable Core validation', async () => {
  for (const validate of [
    async () => ({ data: { valid: false } }),
    async () => { throw new Error('Core unavailable'); },
  ]) {
    const req = { cookies: { userAccessToken: 'bad', customerAccessToken: 'legacy' } };
    const res = response();
    let nextCalled = false;
    await createVerifyCoreBuyer({ validate })(req, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
    assert.equal(req.user, undefined);
  }
});

test('marketplace buyer auth does not turn downstream failures into sign-in errors', async () => {
  const req = { cookies: { userAccessToken: 'core-token' } };
  const middleware = createVerifyCoreBuyer({
    validate: async () => ({ data: { valid: true, entity: { id: 'core-buyer' } } }),
  });
  await assert.rejects(middleware(req, response(), () => {
    throw new Error('downstream failure');
  }), /downstream failure/);
});

test('Store actor auth chooses staff permission over coexisting buyer cookies', async () => {
  const middleware = createVerifyStoreActor({
    validateStaff: async (access, refresh) => {
      assert.equal(access, 'staff-token');
      assert.equal(refresh, undefined);
      return { valid: true, entity: { id: 'staff-id', merchantId: 'owner-id' },
        permissions: ['orders'] };
    },
    verifyMerchant: () => assert.fail('Valid staff must not switch to owner identity'),
  });
  const req = { cookies: { staffAccessToken: 'staff-token',
    userAccessToken: 'owner-token', customerAccessToken: 'customer-token' } };
  let called = false;
  await middleware(req, response(), () => { called = true; });
  assert.equal(req.user.type, 'staff');
  assert.deepEqual(req.user.permissions, ['orders']);
  assert.equal(called, true);
});

test('Store actor auth ignores Customer cookie and uses Core after stale staff token', async () => {
  const middleware = createVerifyStoreActor({
    validateStaff: async () => ({ valid: false }),
    verifyMerchant: createVerifyCoreBuyer({
      errorMessage: 'Merchant authentication required',
      validate: async () => ({ data: { valid: true, entity: { id: 'owner-id' } } }),
    }),
  });
  const req = { cookies: { staffAccessToken: 'stale', userAccessToken: 'owner',
    customerAccessToken: 'legacy' } };
  let called = false;
  await middleware(req, response(), () => { called = true; });
  assert.equal(req.user.id, 'owner-id');
  assert.equal(req.user.type, 'user');
  assert.equal(called, true);
});
