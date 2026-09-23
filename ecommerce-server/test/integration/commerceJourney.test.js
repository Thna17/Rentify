const test = require('node:test');
const assert = require('node:assert/strict');
const { createRequireWebsiteAccess } = require('../../middlewares/requireWebsiteAccess');

const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const site = { userId: 'merchant-a', staffData: [{ id: 'staff-pos' }] };

test('commerce journey contract: product, cart, POS order and payment configuration stay tenant scoped', async () => {
  const guard = createRequireWebsiteAccess({ requiredPermissions: ['pos'], findWebsite: async () => site });
  const denied = response();
  await guard({ user: { id: 'merchant-b', type: 'user' }, params: { websiteId: 'website-a' } }, denied, () => assert.fail('cross-tenant access must fail'));
  assert.equal(denied.statusCode, 403);

  let passed = false;
  await guard({ user: { id: 'staff-pos', type: 'staff', permissions: ['pos'] }, params: { websiteId: 'website-a' } }, response(), () => { passed = true; });
  assert.equal(passed, true);
});

test('commerce journey contract: a staff member without the required permission cannot mutate payment or orders', async () => {
  const guard = createRequireWebsiteAccess({ requiredPermissions: ['orders'], findWebsite: async () => site });
  const denied = response();
  await guard({ user: { id: 'staff-pos', type: 'staff', permissions: ['pos'] }, params: { websiteId: 'website-a' } }, denied, () => assert.fail('permission check must run'));
  assert.equal(denied.statusCode, 403);
});
