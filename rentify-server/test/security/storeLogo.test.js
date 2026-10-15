const test = require('node:test');
const assert = require('node:assert/strict');
const storeService = require('../../src/services/storeService');

const { storeLogoUrl } = storeService;

test('a store logo must be an https link, and can be cleared', () => {
  assert.equal(storeLogoUrl(' https://res.cloudinary.com/demo/logo.jpg '), 'https://res.cloudinary.com/demo/logo.jpg');
  assert.equal(storeLogoUrl(''), null);
  assert.equal(storeLogoUrl(null), null);
  for (const unsafe of ['http://example.com/logo.png', 'javascript:alert(1)', 'data:image/png;base64,AAAA', '//cdn.example.com/a.png', 'https://user:pass@example.com/a.png', 42, `https://example.com/${'a'.repeat(2100)}`]) {
    assert.equal(storeLogoUrl(unsafe), undefined, String(unsafe).slice(0, 40));
  }
});

test('the public store fields include the logo but nothing private', () => {
  assert.deepEqual(storeService.publicStoreAttributes, ['id', 'name', 'slug', 'primaryCategory', 'logoUrl']);
});

test('updating a store rejects an unsafe logo before touching the database', async () => {
  await assert.rejects(
    storeService.updateOwnStore({ ownerUserId: 'u', logoUrl: 'javascript:alert(1)' }),
    (error) => error.statusCode === 400 && /https/.test(error.message)
  );
});
