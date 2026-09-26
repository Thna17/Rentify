const test = require('node:test');
const assert = require('node:assert/strict');
const { Website, Subscription } = require('../../src/models');
const { getMerchantCache } = require('../../src/utils/cache');
const websiteController = require('../../src/modules/websites/websiteController');

test('the public storefront lookup never includes owner or staff contact details', async (t) => {
  const cache = getMerchantCache();
  t.mock.method(cache, 'get', async () => null);
  t.mock.method(cache, 'setWithIndex', async () => true);
  t.mock.method(Subscription, 'findOne', async () => null);
  let query;
  t.mock.method(Website, 'findOne', async (options) => {
    query = options;
    return {
      id: 'website-1',
      storeId: 'store-1',
      userId: 'user-1',
      templateId: 'template-uuid',
      User: { email: 'owner@example.com', phoneNumber: '+85512000000' },
      staffs: [{ id: 'staff-1', email: 'staff@example.com', permissions: ['manage_orders'] }],
      WebsiteTemplate: { websiteTemplateId: 2 },
      WebsiteContents: [],
    };
  });

  let resolveResponse;
  let rejectResponse;
  const completed = new Promise((resolve, reject) => {
    resolveResponse = resolve;
    rejectResponse = reject;
  });
  const response = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; resolveResponse(); return this; },
  };
  websiteController.getWebsiteByDomain(
    { query: { domain: 'shop.example.com' }, headers: {} },
    response,
    rejectResponse,
  );
  await completed;

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.websiteTemplateId, 2);
  const text = JSON.stringify(response.body);
  for (const secret of ['owner@example.com', '+85512000000', 'staff@example.com', 'manage_orders']) {
    assert.equal(text.includes(secret), false, secret);
  }
  assert.equal(query.include.some((item) => item.model?.name === 'User' || item.as === 'staffs'), false);
});
