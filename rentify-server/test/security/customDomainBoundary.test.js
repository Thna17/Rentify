// rentify-server/test/security/customDomainBoundary.test.js
// P2-HOST-003: Custom-domain browse-only boundary security tests for Core API.
// Enforces Release 1 DEC-003, ADR 0002 boundary rules.

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isHostedStorefrontOrigin,
  hostedSubdomainFromHost,
  hostedStorefrontUrl,
} = require('../../src/utils/hostedStorefrontOrigin');
const {
  classifyHost,
  extractHostFromRequest,
  buildSafeHostedRedirectUrl,
} = require('../../src/utils/hostBoundary');
const { resolveReturnUrl } = require('../../src/modules/auth/returnUrlPolicy');
const { validateHostConfig } = require('../../../tools/host-validator');
const productionFixture = require('../../../tools/fixtures/config/production-safe.fixture');

function withEnv(vars, fn) {
  const orig = {};
  for (const k of Object.keys(vars)) {
    orig[k] = process.env[k];
    if (vars[k] === undefined) delete process.env[k];
    else process.env[k] = vars[k];
  }
  try {
    return fn();
  } finally {
    for (const k of Object.keys(orig)) {
      if (orig[k] === undefined) delete process.env[k];
      else process.env[k] = orig[k];
    }
  }
}

test('P2-HOST-003 Core: Hosted subdomain allowed behavior', () => {
  withEnv({
    HOSTED_STOREFRONT_DOMAIN: 'rentifystore.shop',
    HOSTED_STOREFRONT_DEV_PORT: '',
    NODE_ENV: 'production',
  }, () => {
    // 1. Valid single-label hosted origin
    assert.equal(isHostedStorefrontOrigin('https://ceramics.rentifystore.shop'), true);
    assert.equal(hostedSubdomainFromHost('ceramics.rentifystore.shop'), 'ceramics');
    assert.equal(hostedStorefrontUrl('ceramics'), 'https://ceramics.rentifystore.shop');

    // 2. Classify host as HOSTED_STOREFRONT
    const classification = classifyHost('ceramics.rentifystore.shop');
    assert.equal(classification.type, 'HOSTED_STOREFRONT');
    assert.equal(classification.subdomain, 'ceramics');
    assert.equal(classification.isHosted, true);
    assert.equal(classification.isCustom, false);
    assert.equal(classification.hostedStorefrontUrl, 'https://ceramics.rentifystore.shop');

    // 3. Return URL allowed for hosted storefront
    const returnUrl = resolveReturnUrl('https://ceramics.rentifystore.shop/checkout');
    assert.equal(returnUrl, 'https://ceramics.rentifystore.shop/checkout');
  });
});

test('P2-HOST-003 Core: Registered custom domain browse classification', () => {
  withEnv({
    HOSTED_STOREFRONT_DOMAIN: 'rentifystore.shop',
    HOSTED_STOREFRONT_DEV_PORT: '',
    NODE_ENV: 'production',
  }, () => {
    const activeWebsite = {
      id: '11111111-1111-4111-8111-111111111111',
      domain: 'pottery-studio.com',
      subdomain: 'ceramics',
      status: 'active',
    };

    // Classify registered custom domain
    const classification = classifyHost('pottery-studio.com', { website: activeWebsite });
    assert.equal(classification.type, 'CUSTOM_DOMAIN');
    assert.equal(classification.isCustom, true);
    assert.equal(classification.isHosted, false);
    assert.equal(classification.isAllowedBrowseOnly, true);
    assert.equal(classification.subdomain, 'ceramics');
    assert.equal(classification.hostedStorefrontUrl, 'https://ceramics.rentifystore.shop');

    // Inactive website custom domain is treated as UNREGISTERED
    const inactiveWebsite = { ...activeWebsite, status: 'suspended' };
    const inactiveClass = classifyHost('pottery-studio.com', { website: inactiveWebsite });
    assert.equal(inactiveClass.type, 'UNREGISTERED');
    assert.equal(inactiveClass.isCustom, false);
  });
});

test('P2-HOST-003 Core: Custom-domain login rejection (Return URL and Auth boundary)', () => {
  withEnv({
    HOSTED_STOREFRONT_DOMAIN: 'rentifystore.shop',
    HOSTED_STOREFRONT_DEV_PORT: '',
    NODE_ENV: 'production',
  }, () => {
    // Direct return URL to custom domain is strictly prohibited (DEC-003, ADR 0002)
    assert.throws(
      () => resolveReturnUrl('https://pottery-studio.com/checkout'),
      /Return URL is not allowed/
    );
    assert.throws(
      () => resolveReturnUrl('https://pottery-studio.com/auth/callback'),
      /Return URL is not allowed/
    );
    assert.throws(
      () => resolveReturnUrl('http://pottery-studio.com'),
      /Return URL is not allowed/
    );
  });
});

test('P2-HOST-003 Core: Open redirect and URL injection prevention', () => {
  withEnv({
    HOSTED_STOREFRONT_DOMAIN: 'rentifystore.shop',
    HOSTED_STOREFRONT_DEV_PORT: '',
    NODE_ENV: 'production',
  }, () => {
    // 1. Credentials in URL
    assert.throws(
      () => resolveReturnUrl('https://user:pass@ceramics.rentifystore.shop/checkout'),
      /credentials/
    );

    // 2. Authority spoofing via userinfo (@)
    assert.throws(
      () => resolveReturnUrl('https://ceramics.rentifystore.shop@attacker.com/steal'),
      /credentials|not allowed/
    );

    // 3. Nested open redirect query param
    assert.throws(
      () => resolveReturnUrl('https://ceramics.rentifystore.shop/checkout?redirect=https://attacker.com'),
      /Nested open redirect detected/
    );

    // 4. Safe hosted redirect builder strips all query params and path traversal
    const safeUrl = buildSafeHostedRedirectUrl('ceramics', '/checkout?token=secret123&cart=[1,2,3]');
    assert.equal(safeUrl, 'https://ceramics.rentifystore.shop/checkout');
    assert.equal(safeUrl.includes('token'), false);
    assert.equal(safeUrl.includes('cart'), false);

    const safeTraversal = buildSafeHostedRedirectUrl('ceramics', '/../../evil/path');
    assert.equal(safeTraversal, 'https://ceramics.rentifystore.shop/evil/path');
  });
});

test('P2-HOST-003 Core: Sibling subdomain attack rejection', () => {
  withEnv({
    HOSTED_STOREFRONT_DOMAIN: 'rentifystore.shop',
    HOSTED_STOREFRONT_DEV_PORT: '',
    NODE_ENV: 'production',
  }, () => {
    // Sibling on external domain
    assert.equal(isHostedStorefrontOrigin('https://ceramics.rentifystore.shop.attacker.test'), false);
    assert.equal(hostedSubdomainFromHost('ceramics.rentifystore.shop.attacker.test'), null);
    assert.equal(classifyHost('ceramics.rentifystore.shop.attacker.test').type, 'UNREGISTERED');

    // Reserved sibling subdomains
    assert.equal(isHostedStorefrontOrigin('https://admin.rentifystore.shop'), false);
    assert.equal(hostedSubdomainFromHost('admin.rentifystore.shop'), null);
    assert.equal(classifyHost('admin.rentifystore.shop').type, 'UNREGISTERED');

    assert.equal(isHostedStorefrontOrigin('https://checkout.rentifystore.shop'), false);
    assert.equal(hostedSubdomainFromHost('checkout.rentifystore.shop'), null);

    // Multi-label sibling subdomain
    assert.equal(isHostedStorefrontOrigin('https://a.b.rentifystore.shop'), false);
    assert.equal(hostedSubdomainFromHost('a.b.rentifystore.shop'), null);
  });
});

test('P2-HOST-003 Core: Unregistered Host header handling', () => {
  withEnv({
    HOSTED_STOREFRONT_DOMAIN: 'rentifystore.shop',
    HOSTED_STOREFRONT_DEV_PORT: '',
    NODE_ENV: 'production',
  }, () => {
    // Unregistered host
    const result = classifyHost('unregistered-shop-12345.com');
    assert.equal(result.type, 'UNREGISTERED');
    assert.equal(result.isHosted, false);
    assert.equal(result.isCustom, false);
    assert.equal(result.isAllowedBrowseOnly, false);
  });
});

test('P2-HOST-003 Core: Host context extracted only from trusted headers, never body', () => {
  // 1. Origin header
  const reqWithOrigin = {
    get: (h) => (h.toLowerCase() === 'origin' ? 'https://pottery-studio.com' : null),
    body: { domain: 'evil-spoof.com', host: 'attacker.com' },
  };
  assert.equal(extractHostFromRequest(reqWithOrigin), 'pottery-studio.com');

  // 2. Referer header
  const reqWithReferer = {
    get: (h) => (h.toLowerCase() === 'referer' ? 'https://ceramics.rentifystore.shop/products' : null),
    body: { domain: 'evil-spoof.com' },
  };
  assert.equal(extractHostFromRequest(reqWithReferer), 'ceramics.rentifystore.shop');

  // 3. Host header
  const reqWithHost = {
    get: (h) => (h.toLowerCase() === 'host' ? 'ceramics.rentifystore.shop:443' : null),
    body: { domain: 'evil-spoof.com' },
  };
  assert.equal(extractHostFromRequest(reqWithHost), 'ceramics.rentifystore.shop');

  // 4. Request with only body (no trusted headers) returns null
  const reqBodyOnly = {
    get: () => null,
    body: { domain: 'pottery-studio.com', host: 'ceramics.rentifystore.shop' },
  };
  assert.equal(extractHostFromRequest(reqBodyOnly), null);
});

test('P2-HOST-003 Core: Cookie leakage protection across domains', () => {
  // Test cookie isolation
  withEnv({
    NODE_ENV: 'production',
    COOKIE_DOMAIN: 'rentifystore.shop',
  }, () => {
    assert.throws(
      () => {
        delete require.cache[require.resolve('../../src/config/cookieConfig')];
        require('../../src/config/cookieConfig');
      },
      /cross-storefront session leakage risk/
    );
  });
});

test('P2-HOST-003 Core: Feature-flag misconfiguration rejection in host validator', () => {
  // Attempting to enable custom domain checkout in production
  const resCheckoutProd = validateHostConfig({
    ...productionFixture,
    CUSTOM_DOMAIN_CHECKOUT_ENABLED: 'true',
  }, { targetEnv: 'production', throwOnError: false });
  assert.equal(resCheckoutProd.valid, false);
  assert.ok(resCheckoutProd.errors.some((e) => e.field === 'CUSTOM_DOMAIN_CHECKOUT_ENABLED'));

  // Attempting to enable custom domain auth in production
  const resAuthProd = validateHostConfig({
    ...productionFixture,
    CUSTOM_DOMAIN_AUTH_ENABLED: 'true',
  }, { targetEnv: 'production', throwOnError: false });
  assert.equal(resAuthProd.valid, false);
  assert.ok(resAuthProd.errors.some((e) => e.field === 'CUSTOM_DOMAIN_AUTH_ENABLED'));
});
