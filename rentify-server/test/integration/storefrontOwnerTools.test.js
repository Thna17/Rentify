const test = require('node:test');
const assert = require('node:assert/strict');
const { WebsiteContent, Website, WebsiteTemplate } = require('../../src/models');
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

test('template switch validates the template and leaves content untouched', async (t) => {
  const id = '044c94e2-a47c-47d5-895b-33bc00eb5abb';
  const updates = [];
  const website = { id: 'website-1', update: async (change) => updates.push(change) };
  t.mock.method(WebsiteTemplate, 'findByPk', async () => ({ websiteTemplateId: 2 }));
  t.mock.method(Website, 'findByPk', async () => website);
  t.mock.method(Website.sequelize, 'transaction', async (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  t.mock.method(WebsiteContent, 'findOne', async () => assert.fail('content must remain untouched'));
  const sync = require('../../src/modules/commerce-sync').ecommerceSyncService;
  t.mock.method(sync, 'queueWebsiteTemplate', async () => {});
  t.mock.method(sync, 'retryWebsiteSync', async () => {});
  t.mock.method(getMerchantCache(), 'invalidateWebsiteCache', async () => 1);
  const result = await call(websiteController.switchTemplate, { website, body: { templateId: id } });
  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body, { websiteTemplateId: 2 });
  assert.deepEqual(updates, [{ templateId: id }]);
});

test('template switch rejects invalid or unsupported templates', async (t) => {
  t.mock.method(WebsiteTemplate, 'findByPk', async () => ({ websiteTemplateId: 9 }));
  for (const templateId of ['bad', '044c94e2-a47c-47d5-895b-33bc00eb5abb']) {
    const result = await call(websiteController.switchTemplate, { website: { id: 'website-1' }, body: { templateId } });
    assert.equal(result.statusCode, 400);
    assert.equal(result.body.code, 'INVALID_STOREFRONT_TEMPLATE');
  }
});

test('template endpoint requires authentication and website ownership', () => {
  const router = require('../../src/modules/websites/websiteRoutes');
  const route = router.stack.find((layer) => layer.route?.path === '/:websiteId/template').route;
  const { verifyToken } = require('../../src/middlewares/auth');
  const { requireWebsiteOwner } = require('../../src/middlewares/authorization');
  assert.equal(route.stack[0].handle, verifyToken);
  assert.equal(route.stack[1].handle, requireWebsiteOwner);
});

test('template route owner guard denies a different merchant', async () => {
  const { createRequireWebsiteOwner } = require('../../src/middlewares/authorization');
  const guard = createRequireWebsiteOwner({ findWebsite: async () => ({ userId: 'owner' }) });
  const response = { status(code) { this.code = code; return this; }, json() { return this; } };
  let allowed = false;
  await guard({ user: { id: 'other', role: 'user' }, params: { websiteId: 'site' } }, response, () => { allowed = true; });
  assert.equal(response.code, 403);
  assert.equal(allowed, false);
});

test('saving one template layout preserves other template layouts', async (t) => {
  let saved;
  t.mock.method(WebsiteContent.sequelize, 'transaction', async (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  t.mock.method(WebsiteContent, 'findOne', async () => ({ value: { 1: 'categories' }, update: async ({ value }) => { saved = value; } }));
  t.mock.method(getMerchantCache(), 'invalidateWebsiteCache', async () => 1);
  const result = await call(websiteController.updateStorefrontContent, {
    website: { id: 'website-1' }, body: { fields: { 'Page Layout': { 2: 'categories,highlights' } } },
  });
  assert.equal(result.statusCode, 200);
  assert.deepEqual(saved, { 1: 'categories', 2: 'categories,highlights' });
});
