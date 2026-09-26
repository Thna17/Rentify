const test = require('node:test');
const assert = require('node:assert/strict');
const { WebsiteContent } = require('../../src/models');
const { getMerchantCache } = require('../../src/utils/cache');
const websiteController = require('../../src/modules/websites/websiteController');

// The controller's wrapper does not return its promise, so wait for the reply itself.
const call = (handler, req) =>
  new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      headers: {},
      set(name, value) { this.headers[name] = value; return this; },
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; resolve(this); return this; },
    };
    handler(req, res, reject);
  });

test('owner edits update existing rows, create missing ones, and clear the store cache', async (t) => {
  const saved = [];
  const existing = { label: 'Hero Headline', async update(data) { saved.push(['update', 'Hero Headline', data.value]); } };
  t.mock.method(WebsiteContent.sequelize, 'transaction', async (work) => work('tx'));
  t.mock.method(WebsiteContent, 'findOne', async ({ where }) => (where.label === 'Hero Headline' ? existing : null));
  t.mock.method(WebsiteContent, 'create', async (row) => saved.push(['create', row.label, row.value, row.category, row.type]));
  const invalidate = t.mock.method(getMerchantCache(), 'invalidateWebsiteCache', async () => 1);

  const res = await call(websiteController.updateStorefrontContent, {
    website: { id: 'website-1' },
    body: { fields: { 'Hero Headline': 'New headline', 'Story Title': 'Our roots' } },
  });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(saved, [
    ['update', 'Hero Headline', 'New headline'],
    ['create', 'Story Title', 'Our roots', 'Our Story', 'text'],
  ]);
  assert.equal(invalidate.mock.callCount(), 1);
});

test('invalid or non-storefront fields change nothing', async (t) => {
  const findOne = t.mock.method(WebsiteContent, 'findOne', async () => assert.fail('must not touch the database'));
  const res = await call(websiteController.updateStorefrontContent, {
    website: { id: 'website-1' },
    body: { fields: { 'Hero Headline': 'Fine', 'Color Palette': '#fff' } },
  });
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body.fields.map((field) => field.label), ['Color Palette']);
  assert.equal(findOne.mock.callCount(), 0);
});

test('owner access answers only after the owner check and is never cached', async () => {
  const res = await call(websiteController.getStorefrontOwnerAccess, { website: { id: 'website-1' } });
  assert.deepEqual(res.body, { owner: true, websiteId: 'website-1' });
  assert.equal(res.headers['Cache-Control'], 'no-store');
});
