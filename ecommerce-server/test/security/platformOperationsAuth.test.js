const test = require('node:test');
const assert = require('node:assert/strict');
const { createVerifyCoreAdmin } = require('../../modules/admin/verifyCoreAdmin');

const response = () => ({
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
  cookie(name, value, options) { this.cookieSet = { name, value, options }; return this; },
});

test('commerce operations reject non-admin Core identities', async () => {
  for (const type of ['user', 'staff', undefined]) {
    const req = { headers: { authorization: 'Bearer token' }, cookies: {} };
    const res = response();
    let nextCalled = false;
    await createVerifyCoreAdmin({ validate: async () => ({ data: {
      valid: true, entity: { id: 'actor', type },
    } }) })(req, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
  }
});

test('commerce operations prefer the Core session cookie over a stale bearer token', async () => {
  const req = { headers: { authorization: 'Bearer admin-token' },
    cookies: { userAccessToken: 'other-cookie', userRefreshToken: 'refresh' } };
  let submitted;
  let nextCalled = false;
  const res = response();
  await createVerifyCoreAdmin({ validate: async (access, refresh) => {
    submitted = { access, refresh };
    return { data: { valid: true, entity: { id: 'admin-id', type: 'admin' },
      newAccessToken: 'rotated' } };
  } })(req, res, () => { nextCalled = true; });
  assert.deepEqual(submitted, { access: 'other-cookie', refresh: 'refresh' });
  assert.deepEqual(req.user, { id: 'admin-id', role: 'admin' });
  assert.equal(res.cookieSet.name, 'userAccessToken');
  assert.equal(nextCalled, true);
});

test('commerce operations accept a bearer token when no session cookie exists', async () => {
  const req = { headers: { authorization: 'Bearer admin-token' }, cookies: {} };
  let submitted;
  const res = response();
  await createVerifyCoreAdmin({ validate: async (access, refresh) => {
    submitted = { access, refresh };
    return { data: { valid: true, entity: { id: 'admin-id', type: 'admin' } } };
  } })(req, res, () => {});
  assert.deepEqual(submitted, { access: 'admin-token', refresh: undefined });
  assert.equal(req.user.id, 'admin-id');
});

test('commerce operations fail closed when Core validation is unavailable', async () => {
  const req = { headers: {}, cookies: { userAccessToken: 'token' } };
  const res = response();
  await createVerifyCoreAdmin({ validate: async () => { throw new Error('offline'); } })(
    req, res, () => assert.fail('should not grant access'));
  assert.equal(res.statusCode, 401);
});
