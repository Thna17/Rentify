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
