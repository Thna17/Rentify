const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isHostedStorefrontOrigin,
  hostedStorefrontUrl,
  hostedSubdomainFromHost,
} = require('../../src/utils/hostedStorefrontOrigin');
const { subdomainBase } = require('../../src/services/hostedSubdomainService');

const withEnv = (values, run) => {
  const saved = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  Object.assign(process.env, values);
  try {
    run();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
};

test('production accepts only HTTPS single-label hosted origins', () => {
  withEnv({ HOSTED_STOREFRONT_DOMAIN: 'rentifystore.shop', HOSTED_STOREFRONT_DEV_PORT: '4900', NODE_ENV: 'production' }, () => {
    assert.equal(isHostedStorefrontOrigin('https://aura.rentifystore.shop'), true);
    for (const origin of [
      'http://aura.rentifystore.shop',
      'http://aura.rentifystore.shop:4900',
      'https://aura.rentifystore.shop:8443',
      'https://a.b.rentifystore.shop',
      'https://-aura.rentifystore.shop',
      'https://rentifystore.shop',
      'https://aura.rentifystore.shop.attacker.test',
      'https://user:pass@aura.rentifystore.shop',
    ]) assert.equal(isHostedStorefrontOrigin(origin), false, origin);
    assert.equal(hostedStorefrontUrl('aura'), 'https://aura.rentifystore.shop');
  });
});

test('local development may use one HTTP port on *.localhost', () => {
  withEnv({ HOSTED_STOREFRONT_DOMAIN: 'localhost', HOSTED_STOREFRONT_DEV_PORT: '4900', NODE_ENV: 'development' }, () => {
    assert.equal(isHostedStorefrontOrigin('http://aura.localhost:4900'), true);
    assert.equal(isHostedStorefrontOrigin('http://aura.localhost:5000'), false);
    assert.equal(isHostedStorefrontOrigin('http://localhost:4900'), false);
    assert.equal(hostedStorefrontUrl('aura'), 'http://aura.localhost:4900');
    assert.equal(hostedSubdomainFromHost('Aura.localhost:4900'), 'aura');
    assert.equal(hostedSubdomainFromHost('localhost:4700'), null);
  });
});

test('hosting stays off until a domain is configured', () => {
  withEnv({ HOSTED_STOREFRONT_DOMAIN: '' }, () => {
    assert.equal(isHostedStorefrontOrigin('https://aura.rentifystore.shop'), false);
    assert.equal(hostedStorefrontUrl('aura'), null);
    assert.equal(hostedSubdomainFromHost('aura.rentifystore.shop'), null);
  });
});

test('store names become safe subdomains', () => {
  const id = 'a1b2c3d4-0000-4000-8000-000000000000';
  assert.equal(subdomainBase('Aura Botanicals', id), 'aura-botanicals');
  assert.equal(subdomainBase('  Café & Crème!! ', id), 'cafe-and-creme');
  assert.equal(subdomainBase('Admin', id), 'store-a1b2c3d4');
  assert.equal(subdomainBase('ហាងអាវ', id), 'store-a1b2c3d4');
  assert.equal(subdomainBase('AB', id), 'store-a1b2c3d4');
  assert.ok(subdomainBase('x'.repeat(80), id).length <= 40);
});

test('names used by other sites on the domain are never storefronts', () => {
  withEnv(
    { HOSTED_STOREFRONT_DOMAIN: 'mekhla.digital', HOSTED_STOREFRONT_RESERVED: 'admin, api,colis', HOSTED_STOREFRONT_DEV_PORT: '', NODE_ENV: 'production' },
    () => {
      assert.equal(isHostedStorefrontOrigin('https://aura.mekhla.digital'), true);
      assert.equal(isHostedStorefrontOrigin('https://colis.mekhla.digital'), false);
      assert.equal(hostedSubdomainFromHost('api.mekhla.digital'), null);
      assert.equal(hostedStorefrontUrl('admin'), null);
      assert.equal(subdomainBase('Colis', 'a1b2c3d4-0000'), 'store-a1b2c3d4');
    }
  );
});
