// ecommerce-server/test/security/customDomainBoundary.test.js
// P2-HOST-003: Custom-domain browse-only boundary security tests for Commerce API.
// Enforces Release 1 DEC-003: custom domains are browse-only; direct auth & checkout fail closed.

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isHostedStorefrontOrigin,
  hostedSubdomainFromHost,
  hostedStorefrontUrl,
} = require('../../utils/hostedStorefrontOrigin');
const {
  classifyCommerceHost,
  extractHostFromRequest,
  buildSafeHostedRedirectUrl,
} = require('../../utils/hostBoundary');
const { enforceCustomDomainBoundary } = require('../../middlewares/customDomainBoundary');

async function withEnv(vars, fn) {
  const orig = {};
  for (const k of Object.keys(vars)) {
    orig[k] = process.env[k];
    if (vars[k] === undefined) delete process.env[k];
    else process.env[k] = vars[k];
  }
  try {
    return await fn();
  } finally {
    for (const k of Object.keys(orig)) {
      if (orig[k] === undefined) delete process.env[k];
      else process.env[k] = orig[k];
    }
  }
}

test('P2-HOST-003 Commerce: Hosted subdomain allowed behavior', () => {
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
    const classification = classifyCommerceHost('ceramics.rentifystore.shop');
    assert.equal(classification.type, 'HOSTED_STOREFRONT');
    assert.equal(classification.subdomain, 'ceramics');
    assert.equal(classification.isHosted, true);
    assert.equal(classification.isCustom, false);
    assert.equal(classification.hostedStorefrontUrl, 'https://ceramics.rentifystore.shop');
  });
});

test('P2-HOST-003 Commerce: Registered custom domain browse classification', () => {
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
    const classification = classifyCommerceHost('pottery-studio.com', { website: activeWebsite });
    assert.equal(classification.type, 'CUSTOM_DOMAIN');
    assert.equal(classification.isCustom, true);
    assert.equal(classification.isHosted, false);
    assert.equal(classification.isAllowedBrowseOnly, true);
    assert.equal(classification.subdomain, 'ceramics');
    assert.equal(classification.hostedStorefrontUrl, 'https://ceramics.rentifystore.shop');

    // Inactive website custom domain is treated as UNREGISTERED
    const inactiveWebsite = { ...activeWebsite, status: 'suspended' };
    const inactiveClass = classifyCommerceHost('pottery-studio.com', { website: inactiveWebsite });
    assert.equal(inactiveClass.type, 'UNREGISTERED');
    assert.equal(inactiveClass.isCustom, false);
  });
});

test('P2-HOST-003 Commerce: Custom-domain login rejection via middleware', async () => {
  await withEnv({
    HOSTED_STOREFRONT_DOMAIN: 'rentifystore.shop',
    HOSTED_STOREFRONT_DEV_PORT: '',
    NODE_ENV: 'production',
  }, async () => {
    const middleware = enforceCustomDomainBoundary('auth');

    // Simulate mock WebsiteData lookup for registered custom domain
    const { WebsiteData } = require('../../models');
    const origFindOne = WebsiteData.findOne;
    WebsiteData.findOne = async () => ({
      id: 'website-1',
      domain: 'pottery-studio.com',
      subdomain: 'ceramics',
      status: 'active',
    });

    try {
      const req = {
        get: (h) => (h.toLowerCase() === 'origin' ? 'https://pottery-studio.com' : null),
        body: {},
      };
      let statusCalled = null;
      let jsonCalled = null;
      const res = {
        status: (s) => {
          statusCalled = s;
          return res;
        },
        json: (data) => {
          jsonCalled = data;
          return res;
        },
      };

      let nextCalled = false;
      await middleware(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, false, 'Middleware must not call next() for custom domain auth');
      assert.equal(statusCalled, 403);
      assert.equal(jsonCalled.code, 'CUSTOM_DOMAIN_AUTH_DISABLED');
      assert.equal(jsonCalled.hostedStorefrontUrl, 'https://ceramics.rentifystore.shop');
    } finally {
      WebsiteData.findOne = origFindOne;
    }
  });
});

test('P2-HOST-003 Commerce: Custom-domain checkout rejection via middleware', async () => {
  await withEnv({
    HOSTED_STOREFRONT_DOMAIN: 'rentifystore.shop',
    HOSTED_STOREFRONT_DEV_PORT: '',
    NODE_ENV: 'production',
  }, async () => {
    const middleware = enforceCustomDomainBoundary('checkout');

    const { WebsiteData } = require('../../models');
    const origFindOne = WebsiteData.findOne;
    WebsiteData.findOne = async () => ({
      id: 'website-1',
      domain: 'pottery-studio.com',
      subdomain: 'ceramics',
      status: 'active',
    });

    try {
      const req = {
        get: (h) => (h.toLowerCase() === 'origin' ? 'https://pottery-studio.com' : null),
        body: {},
      };
      let statusCalled = null;
      let jsonCalled = null;
      const res = {
        status: (s) => {
          statusCalled = s;
          return res;
        },
        json: (data) => {
          jsonCalled = data;
          return res;
        },
      };

      let nextCalled = false;
      await middleware(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, false, 'Middleware must not call next() for custom domain checkout');
      assert.equal(statusCalled, 403);
      assert.equal(jsonCalled.code, 'CUSTOM_DOMAIN_CHECKOUT_DISABLED');
      assert.equal(jsonCalled.hostedStorefrontUrl, 'https://ceramics.rentifystore.shop');
      assert.equal(jsonCalled.hostedCheckoutUrl, 'https://ceramics.rentifystore.shop/checkout');
    } finally {
      WebsiteData.findOne = origFindOne;
    }
  });
});

test('P2-HOST-003 Commerce: Custom-domain cart mutation rejection via middleware', async () => {
  await withEnv({
    HOSTED_STOREFRONT_DOMAIN: 'rentifystore.shop',
    HOSTED_STOREFRONT_DEV_PORT: '',
    NODE_ENV: 'production',
  }, async () => {
    const middleware = enforceCustomDomainBoundary('cart');

    const { WebsiteData } = require('../../models');
    const origFindOne = WebsiteData.findOne;
    WebsiteData.findOne = async () => ({
      id: 'website-1',
      domain: 'pottery-studio.com',
      subdomain: 'ceramics',
      status: 'active',
    });

    try {
      const req = {
        get: (h) => (h.toLowerCase() === 'origin' ? 'https://pottery-studio.com' : null),
        body: {},
      };
      let statusCalled = null;
      let jsonCalled = null;
      const res = {
        status: (s) => {
          statusCalled = s;
          return res;
        },
        json: (data) => {
          jsonCalled = data;
          return res;
        },
      };

      let nextCalled = false;
      await middleware(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, false, 'Middleware must not call next() for custom domain cart');
      assert.equal(statusCalled, 403);
      assert.equal(jsonCalled.code, 'CUSTOM_DOMAIN_CART_DISABLED');
    } finally {
      WebsiteData.findOne = origFindOne;
    }
  });
});

test('P2-HOST-003 Commerce: Sibling subdomain and unregistered host rejection', () => {
  withEnv({
    HOSTED_STOREFRONT_DOMAIN: 'rentifystore.shop',
    HOSTED_STOREFRONT_DEV_PORT: '',
    NODE_ENV: 'production',
  }, () => {
    // Sibling on attacker domain
    assert.equal(isHostedStorefrontOrigin('https://ceramics.rentifystore.shop.attacker.test'), false);
    assert.equal(hostedSubdomainFromHost('ceramics.rentifystore.shop.attacker.test'), null);
    assert.equal(classifyCommerceHost('ceramics.rentifystore.shop.attacker.test').type, 'UNREGISTERED');

    // Reserved sibling subdomains
    assert.equal(isHostedStorefrontOrigin('https://admin.rentifystore.shop'), false);
    assert.equal(hostedSubdomainFromHost('admin.rentifystore.shop'), null);
    assert.equal(classifyCommerceHost('admin.rentifystore.shop').type, 'UNREGISTERED');

    // Unregistered host
    const result = classifyCommerceHost('unregistered-domain-999.com');
    assert.equal(result.type, 'UNREGISTERED');
  });
});

test('P2-HOST-003 Commerce: Safe hosted redirect URL construction', () => {
  withEnv({
    HOSTED_STOREFRONT_DOMAIN: 'rentifystore.shop',
    HOSTED_STOREFRONT_DEV_PORT: '',
    NODE_ENV: 'production',
  }, () => {
    const safeUrl = buildSafeHostedRedirectUrl('ceramics', '/checkout?token=leak&pii=user@email.com');
    assert.equal(safeUrl, 'https://ceramics.rentifystore.shop/checkout');
    assert.equal(safeUrl.includes('token'), false);
    assert.equal(safeUrl.includes('pii'), false);

    const safeTraverse = buildSafeHostedRedirectUrl('ceramics', '/../../evil/path');
    assert.equal(safeTraverse, 'https://ceramics.rentifystore.shop/evil/path');
  });
});

test('P2-HOST-003 Commerce: Cookie leakage protection across domains', () => {
  withEnv({
    NODE_ENV: 'production',
    COOKIE_DOMAIN: 'rentifystore.shop',
  }, () => {
    assert.throws(
      () => {
        delete require.cache[require.resolve('../../config/cookieConfig')];
        require('../../config/cookieConfig');
      },
      /cross-storefront session leakage risk/
    );
  });
});

test('P2-HOST-003 Commerce: Host context strictly ignores request body data', () => {
  const reqBodySpoof = {
    get: (h) => (h.toLowerCase() === 'origin' ? 'https://pottery-studio.com' : null),
    body: {
      domain: 'ceramics.rentifystore.shop', // Malicious attempt to claim hosted subdomain in body
      host: 'rentifystore.shop',
    },
  };
  assert.equal(extractHostFromRequest(reqBodySpoof), 'pottery-studio.com');
});

// Regression: configured local origins include a port, while request extraction
// returns a hostname. A legacy WebsiteData domain must not override platform hosts.
test('central marketplace localhost is not misclassified as a registered custom domain', async () => {
  assert.equal(classifyCommerceHost(extractHostFromRequest({ get: h => h === 'origin' ? 'http://localhost:4500' : null }), { website: { domain: 'localhost', status: 'active' } }).type, 'CENTRAL_PLATFORM');
  const { WebsiteData } = require('../../models');
  const original = WebsiteData.findOne;
  let queried = false; let passed = false;
  WebsiteData.findOne = async () => { queried = true; return { domain: 'localhost', status: 'active' }; };
  try {
    await enforceCustomDomainBoundary('cart')({ get: h => h === 'origin' ? 'http://localhost:4500' : null }, { status: () => { throw Error('Platform cart should be allowed'); } }, () => { passed = true; });
    assert.equal(passed, true); assert.equal(queried, false);
  } finally { WebsiteData.findOne = original; }
});
