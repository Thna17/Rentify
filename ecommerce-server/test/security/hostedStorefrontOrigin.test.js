const test = require('node:test');
const assert = require('node:assert/strict');
const { isHostedStorefrontOrigin } = require('../../utils/hostedStorefrontOrigin');

test('hosted storefront CORS accepts only controlled single-label HTTPS origins', () => {
  const original = process.env.HOSTED_STOREFRONT_DOMAIN;
  try {
    delete process.env.HOSTED_STOREFRONT_DOMAIN;
    assert.equal(isHostedStorefrontOrigin('https://ceramics.rentifystore.shop'), false);
    process.env.HOSTED_STOREFRONT_DOMAIN = 'rentifystore.shop';
    assert.equal(isHostedStorefrontOrigin('https://ceramics.rentifystore.shop'), true);
    for (const origin of [
      'https://rentifystore.shop', 'https://a.b.rentifystore.shop',
      'http://ceramics.rentifystore.shop', 'https://ceramics.rentifystore.shop:8443',
      'https://ceramics.rentifystore.shop.attacker.test',
    ]) assert.equal(isHostedStorefrontOrigin(origin), false, origin);
  } finally {
    if (original === undefined) delete process.env.HOSTED_STOREFRONT_DOMAIN;
    else process.env.HOSTED_STOREFRONT_DOMAIN = original;
  }
});

test('local development may allow one HTTP port on *.localhost, never in production', () => {
  const saved = { ...process.env };
  try {
    Object.assign(process.env, { HOSTED_STOREFRONT_DOMAIN: 'localhost', HOSTED_STOREFRONT_DEV_PORT: '4900', NODE_ENV: 'development' });
    assert.equal(isHostedStorefrontOrigin('http://aura.localhost:4900'), true);
    assert.equal(isHostedStorefrontOrigin('http://aura.localhost:5000'), false);
    assert.equal(isHostedStorefrontOrigin('http://localhost:4900'), false);
    process.env.NODE_ENV = 'production';
    assert.equal(isHostedStorefrontOrigin('http://aura.localhost:4900'), false);
  } finally {
    for (const key of ['HOSTED_STOREFRONT_DOMAIN', 'HOSTED_STOREFRONT_DEV_PORT', 'NODE_ENV']) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
});
