const test = require('node:test');
const assert = require('node:assert/strict');
const { Website } = require('../../src/models');
const { getMerchantCache } = require('../../src/utils/cache');
const ecommerceSyncService = require('../../src/services/ecommerceSyncService');
const deploymentService = require('../../src/services/deploymentService');

const withHosting = (t, { domain = 'rentifystore.shop', devPort = '', env = 'production' } = {}) => {
  const saved = {
    HOSTED_STOREFRONT_DOMAIN: process.env.HOSTED_STOREFRONT_DOMAIN,
    HOSTED_STOREFRONT_DEV_PORT: process.env.HOSTED_STOREFRONT_DEV_PORT,
    NODE_ENV: process.env.NODE_ENV,
  };
  process.env.HOSTED_STOREFRONT_DOMAIN = domain;
  process.env.HOSTED_STOREFRONT_DEV_PORT = devPort;
  process.env.NODE_ENV = env;
  t.after(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
};

const fakeWebsite = (overrides = {}) => ({
  id: 'a1b2c3d4-0000-4000-8000-000000000000',
  name: 'Aura Botanicals',
  subdomain: null,
  status: 'customization',
  deploymentHistory: [],
  WebsiteTemplate: { websiteTemplateId: 2 },
  updates: [],
  set(key, value) { this[key] = value; },
  async update(data) { this.updates.push(data); Object.assign(this, data); },
  ...overrides,
});

const stubSideEffects = (t) => {
  const calls = [];
  t.mock.method(ecommerceSyncService, 'updateWebsiteStatus', async (id, status, domain) => calls.push(['commerce', id, status, domain]));
  t.mock.method(getMerchantCache(), 'invalidateWebsiteCache', async (id) => calls.push(['cache', id]));
  return calls;
};

test('publishing reserves a subdomain from the store name and goes live without a build', async (t) => {
  withHosting(t);
  const website = fakeWebsite();
  t.mock.method(Website, 'findByPk', async () => website);
  t.mock.method(Website, 'findAll', async () => [{ subdomain: 'aura-botanicals' }]);
  const calls = stubSideEffects(t);

  const result = await deploymentService.publishWebsite(website.id);

  assert.deepEqual(result, {
    deploymentUrl: 'https://aura-botanicals-2.rentifystore.shop',
    subdomain: 'aura-botanicals-2',
    status: 'READY',
  });
  assert.equal(website.subdomain, 'aura-botanicals-2');
  assert.equal(website.status, 'active');
  assert.deepEqual(calls, [
    ['commerce', website.id, 'active', 'aura-botanicals-2.rentifystore.shop'],
    ['cache', website.id],
  ]);
});

test('publishing again keeps the first subdomain', async (t) => {
  withHosting(t, { domain: 'localhost', devPort: '4900', env: 'development' });
  const website = fakeWebsite({ subdomain: 'aura', status: 'active' });
  t.mock.method(Website, 'findByPk', async () => website);
  t.mock.method(Website, 'findAll', async () => assert.fail('an existing subdomain needs no lookup'));
  stubSideEffects(t);

  const result = await deploymentService.publishWebsite(website.id);
  assert.equal(result.deploymentUrl, 'http://aura.localhost:4900');
});

test('publishing refuses unknown templates and unconfigured hosting', async (t) => {
  withHosting(t, { domain: '' });
  t.mock.method(Website, 'findByPk', async () => fakeWebsite());
  await assert.rejects(deploymentService.publishWebsite('w'), /HOSTED_STOREFRONT_DOMAIN/);

  process.env.HOSTED_STOREFRONT_DOMAIN = 'rentifystore.shop';
  Website.findByPk.mock.mockImplementation(async () => fakeWebsite({ WebsiteTemplate: { websiteTemplateId: 9 } }));
  await assert.rejects(deploymentService.publishWebsite('w'), /Template 9 cannot be published/);
});
