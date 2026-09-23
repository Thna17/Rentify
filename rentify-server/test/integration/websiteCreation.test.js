const test = require('node:test');
const assert = require('node:assert/strict');
const { Website, WebsiteTemplate, User, Staff, Package, Payment, Subscription, WebsiteSyncOutbox } = require('../../src/models');
const websiteService = require('../../src/services/websiteService');
const subscriptionService = require('../../src/services/subscriptionService');
const ecommerceSyncService = require('../../src/services/ecommerceSyncService');
const deploymentController = require('../../src/controllers/deploymentController');

const businessData = {
  name: 'Test shop',
  email: 'shop@example.test',
  contact: '012345678',
};

function setupCreation(t, { failSubscription = false } = {}) {
  const calls = [];
  const transaction = {
    finished: false,
    async commit() { calls.push('commit'); this.finished = 'commit'; },
    async rollback() { calls.push('rollback'); this.finished = 'rollback'; },
  };
  const pkg = { id: 'package-1', name: 'Trial', limits: {}, features: {}, get() { return this; } };
  const template = { websiteTemplateId: 1, TemplateContents: [] };
  const user = { id: 'user-1', name: 'Merchant', email: 'merchant@example.test' };
  const website = {
    id: 'website-1',
    domain: null,
    async update(data, options) {
      assert.equal(options.transaction, transaction);
      assert.equal(data.subscriptionId, 'subscription-1');
      calls.push('link subscription');
    },
  };

  t.mock.method(Website.sequelize, 'transaction', async () => transaction);
  t.mock.method(WebsiteTemplate, 'findByPk', async () => template);
  t.mock.method(Package, 'findByPk', async () => pkg);
  t.mock.method(User, 'findByPk', async () => user);
  t.mock.method(Staff, 'findAll', async () => []);
  t.mock.method(Website, 'create', async (_data, options) => {
    assert.equal(options.transaction, transaction);
    calls.push('create website');
    return website;
  });
  t.mock.method(WebsiteSyncOutbox, 'create', async (data, options) => {
    assert.equal(data.websiteId, website.id);
    assert.equal(options.transaction, transaction);
    calls.push('queue commerce sync');
  });
  t.mock.method(subscriptionService, 'createTrialSubscription', async (_userId, _packageId, websiteId, tx) => {
    assert.equal(websiteId, website.id);
    assert.equal(tx, transaction);
    calls.push('create subscription');
    if (failSubscription) throw new Error('subscription failed');
    return {
      id: 'subscription-1',
      endDate: new Date('2026-10-23T00:00:00Z'),
      Package: pkg,
    };
  });
  return { calls, website };
}

test('website and required trial subscription commit together in dependency order', async (t) => {
  const { calls, website } = setupCreation(t);
  const result = await websiteService.createWebsiteWithTrial({
    userId: 'user-1', templateId: 'template-1', packageId: 'package-1', businessData,
  });
  assert.equal(result, website);
  assert.deepEqual(calls, ['create website', 'create subscription', 'link subscription', 'queue commerce sync', 'commit']);
  assert.equal(result._ecommerceData.websiteId, website.id);
});

test('failed trial creation rolls back the website', async (t) => {
  const { calls } = setupCreation(t, { failSubscription: true });
  await assert.rejects(
    websiteService.createWebsiteWithTrial({
      userId: 'user-1', templateId: 'template-1', packageId: 'package-1', businessData,
    }),
    /subscription failed/
  );
  assert.deepEqual(calls, ['create website', 'create subscription', 'rollback']);
});

test('new and updated website statuses use Commerce-supported values', async (t) => {
  const posted = [];
  const updated = [];
  t.mock.method(ecommerceSyncService.apiClient, 'post', async (_path, payload) => posted.push(payload));
  t.mock.method(ecommerceSyncService.apiClient, 'put', async (_path, payload) => updated.push(payload));
  t.mock.method(WebsiteSyncOutbox, 'update', async () => [1]);
  t.mock.method(WebsiteSyncOutbox, 'findByPk', async () => null);
  t.mock.method(WebsiteSyncOutbox, 'create', async (data) => ({ payload: data.payload }));
  await ecommerceSyncService.syncWebsiteData({
    id: 'website-1',
    _ecommerceData: { websiteId: 'website-1', status: 'customization' },
  });
  await ecommerceSyncService.updateWebsiteStatus('website-1', 'active');
  assert.equal(posted[0].status, 'inactive');
  assert.equal(updated[0].status, 'active');
});

test('failed Commerce sync leaves a retryable outbox entry', async (t) => {
  const calls = [];
  t.mock.method(ecommerceSyncService.apiClient, 'post', async () => { throw new Error('Commerce unavailable'); });
  t.mock.method(WebsiteSyncOutbox, 'increment', async () => calls.push('attempt'));
  t.mock.method(WebsiteSyncOutbox, 'update', async (data) => calls.push(data.lastError));
  await ecommerceSyncService.syncWebsiteData({
    id: 'website-1',
    _ecommerceData: { websiteId: 'website-1', status: 'customization' },
  });
  assert.deepEqual(calls, ['attempt', 'Commerce unavailable']);
});

test('failed deployment status sync keeps the updated status queued for retry', async (t) => {
  const outbox = {
    payload: { websiteId: 'website-1', status: 'customization' },
    status: 'synced',
    async update(data) { Object.assign(this, data); },
    async increment() { this.attempts = (this.attempts || 0) + 1; },
  };
  t.mock.method(WebsiteSyncOutbox, 'findByPk', async () => outbox);
  t.mock.method(ecommerceSyncService.apiClient, 'post', async () => { throw new Error('Commerce unavailable'); });
  t.mock.method(WebsiteSyncOutbox, 'increment', async () => {});
  t.mock.method(WebsiteSyncOutbox, 'update', async () => [1]);
  await assert.rejects(
    ecommerceSyncService.updateWebsiteStatus('website-1', 'active', 'shop.rentify.test'),
    /pending retry/
  );
  assert.equal(outbox.status, 'pending');
  assert.equal(outbox.payload.status, 'active');
  assert.equal(outbox.payload.domain, 'shop.rentify.test');
});

test('deployment completion updates Commerce after the Core website', async (t) => {
  const calls = [];
  const website = {
    domain: 'shop.rentify.test',
    async update(data) { calls.push(`core:${data.status}`); },
  };
  t.mock.method(Website, 'findByPk', async () => website);
  t.mock.method(ecommerceSyncService, 'updateWebsiteStatus', async (id, status, domain) => {
    assert.equal(id, 'website-1');
    assert.equal(domain, website.domain);
    calls.push(`commerce:${status}`);
  });
  const response = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  await deploymentController.updateWebsiteStatus({
    body: { websiteId: 'website-1', status: 'active' },
  }, response);
  assert.equal(response.body.success, true);
  assert.deepEqual(calls, ['core:active', 'commerce:active']);
});

test('paid subscription keeps the existing website foreign key', async (t) => {
  t.mock.method(Package, 'findByPk', async () => ({ id: 'package-1', get() { return this; } }));
  t.mock.method(Payment, 'findByPk', async () => ({ id: 'payment-1', userId: 'user-1', status: 'completed' }));
  t.mock.method(Website, 'findOne', async () => ({ id: 'website-1' }));
  t.mock.method(Subscription, 'create', async (data) => {
    assert.equal(data.websiteId, 'website-1');
    return { get() { return { id: 'subscription-1', ...data }; } };
  });
  const result = await subscriptionService.createPaidSubscription('user-1', 'package-1', 'payment-1');
  assert.equal(result.websiteId, 'website-1');
});
