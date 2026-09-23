const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveReturnUrl } = require('../../src/utils/returnUrlPolicy');
const { createRequireAdmin } = require('../../src/middlewares/authorization');

const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

test('merchant journey contract: only admins can create platform templates', async () => {
  const requireAdmin = createRequireAdmin({ findUser: async (id) => ({ id, role: id === 'admin-1' ? 'admin' : 'user' }) });
  const denied = response();
  await requireAdmin({ user: { id: 'merchant-1', role: 'user' } }, denied, () => assert.fail('must deny merchant'));
  assert.equal(denied.statusCode, 403);
  let passed = false;
  await requireAdmin({ user: { id: 'admin-1', role: 'admin' } }, response(), () => { passed = true; });
  assert.equal(passed, true);
});

test('merchant journey contract: login return URLs stay on approved Rentify origins', () => {
  process.env.AUTH_RETURN_URL_ALLOWLIST = 'https://merchant.rentify.test';
  assert.equal(resolveReturnUrl('https://merchant.rentify.test/dashboard'), 'https://merchant.rentify.test/dashboard');
  assert.throws(() => resolveReturnUrl('https://attacker.test/redirect'), /not allowed/);
});
