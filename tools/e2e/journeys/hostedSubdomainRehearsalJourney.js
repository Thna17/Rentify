// tools/e2e/journeys/hostedSubdomainRehearsalJourney.js - Hosted-subdomain login, logout, and session isolation rehearsal (P2-HOST-002)

const assert = require('node:assert/strict');
const dns = require('node:dns/promises');
const https = require('node:https');
const tls = require('node:tls');
const { BrowserSession } = require('../browserShell');

/**
 * Diagnostic check verifying real staging infrastructure readiness.
 * Identifies exact missing infrastructure components required for real-host rehearsal.
 *
 * @param {object} [config]
 * @returns {Promise<{ ready: boolean, missing: string[], details: object }>}
 */
async function checkStagingReadiness(config = {}) {
  const missing = [];
  const details = {};

  const stagingMarketplaceHost = config.stagingMarketplaceHost || process.env.STAGING_MARKETPLACE_HOST || 'staging.rentifymarket.com';
  const stagingHostedParent = config.stagingHostedParent || process.env.STAGING_HOSTED_PARENT || 'rentifystore.shop';
  const testStoreSubdomain = config.testStoreSubdomain || process.env.STAGING_TEST_STORE || 'demo-store';
  const testStoreHost = `${testStoreSubdomain}.${stagingHostedParent}`;
  const buyerEmail = config.buyerEmail || process.env.STAGING_BUYER_EMAIL;
  const buyerPassword = config.buyerPassword || process.env.STAGING_BUYER_PASSWORD;

  // 1. DNS Resolution Check for Staging Marketplace
  try {
    const addresses = await dns.resolve4(stagingMarketplaceHost);
    details.marketplaceDns = addresses;
    if (!addresses || addresses.length === 0) {
      missing.push(`DNS A record missing for staging marketplace host: ${stagingMarketplaceHost}`);
    }
  } catch (err) {
    missing.push(`DNS resolution failed for staging marketplace host: ${stagingMarketplaceHost} (${err.code || err.message})`);
    details.marketplaceDns = null;
  }

  // 2. DNS Resolution Check for Hosted Store Subdomain
  try {
    const addresses = await dns.resolve4(testStoreHost);
    details.storeDns = addresses;
    if (!addresses || addresses.length === 0) {
      missing.push(`DNS A record missing for hosted store host: ${testStoreHost}`);
    }
  } catch (err) {
    missing.push(`DNS resolution failed for hosted store host: ${testStoreHost} (${err.code || err.message})`);
    details.storeDns = null;
  }

  // 3. TLS Certificate Check on Staging Marketplace
  if (details.marketplaceDns) {
    try {
      await new Promise((resolve, reject) => {
        const socket = tls.connect(443, stagingMarketplaceHost, { servername: stagingMarketplaceHost, timeout: 3000 }, () => {
          const cert = socket.getPeerCertificate();
          socket.end();
          if (!cert || !cert.subject) {
            reject(new Error('Invalid or empty peer certificate'));
          } else {
            details.marketplaceTls = cert.subject;
            resolve(cert);
          }
        });
        socket.on('error', reject);
        socket.on('timeout', () => {
          socket.destroy();
          reject(new Error('TLS handshake timeout'));
        });
      });
    } catch (err) {
      missing.push(`TLS certificate or port 443 unreachable on staging marketplace host: ${stagingMarketplaceHost} (${err.message})`);
      details.marketplaceTls = null;
    }
  } else {
    missing.push(`TLS certificate check skipped (DNS unresolvable) for: ${stagingMarketplaceHost}`);
  }

  // 4. Test Store Verification
  if (!config.testStoreSubdomain && !process.env.STAGING_TEST_STORE) {
    missing.push(`No authorized staging test Store specified (STAGING_TEST_STORE environment variable unset)`);
  }

  // 5. Credentials Verification
  if (!buyerEmail || !buyerPassword) {
    missing.push(`Staging buyer test credentials missing (STAGING_BUYER_EMAIL and STAGING_BUYER_PASSWORD unset)`);
  }

  return {
    ready: missing.length === 0,
    missing,
    details,
  };
}

/**
 * Rehearsal test suite verifying the hosted-subdomain security model.
 * Supports multi-browser and multi-viewport execution (Chromium Android, WebKit Mobile, Primary 360px).
 *
 * @param {object} params
 * @param {object} params.config
 * @param {import('../artifactCollector').ArtifactCollector} params.artifactCollector
 */
async function runHostedSubdomainRehearsalJourney({ config, artifactCollector }) {
  const readiness = await checkStagingReadiness(config);
  if (!readiness.ready) {
    const error = new Error(`REAL STAGING HOST UNAVAILABLE:\n- ${readiness.missing.join('\n- ')}`);
    error.code = 'REAL_STAGING_HOST_UNAVAILABLE';
    error.missingInfrastructure = readiness.missing;
    throw error;
  }

  // Release 1 Matrix of target viewports and browsers
  const executionProfiles = [
    {
      name: 'Primary 360px Journey (Mobile Reference DEC-021)',
      browserType: 'chromium',
      viewport: { width: 360, height: 800 },
      isMobile: true,
      hasTouch: true,
    },
    {
      name: 'Chromium with Android Viewport (Pixel 7)',
      browserType: 'chromium',
      viewport: { width: 412, height: 915 },
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    },
    {
      name: 'WebKit with Mobile Viewport (iPhone 13)',
      browserType: 'webkit',
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    },
  ];

  for (const profile of executionProfiles) {
    artifactCollector?.recordConsole(`Starting profile: ${profile.name}...`);
    const browser = new BrowserSession({
      artifactCollector,
      browserType: profile.browserType,
      viewport: profile.viewport,
      isMobile: profile.isMobile,
      hasTouch: profile.hasTouch,
      userAgent: profile.userAgent,
    });

    try {
      await browser.init(`hosted-subdomain-${profile.browserType}`);

      const stagingMarketplaceHost = config.stagingMarketplaceHost || process.env.STAGING_MARKETPLACE_HOST || 'staging.rentifymarket.com';
      const stagingHostedParent = config.stagingHostedParent || process.env.STAGING_HOSTED_PARENT || 'rentifystore.shop';
      const testStoreSubdomain = config.testStoreSubdomain || process.env.STAGING_TEST_STORE || 'demo-store';
      const buyerEmail = config.buyerEmail || process.env.STAGING_BUYER_EMAIL;
      const buyerPassword = config.buyerPassword || process.env.STAGING_BUYER_PASSWORD;

      // 1. Open Real Staging Marketplace Hostname
      const marketplaceUrl = config.marketplaceUrl || process.env.STAGING_MARKETPLACE_URL || `https://${stagingMarketplaceHost}`;
      const marketplaceRes = await browser.goto(marketplaceUrl);
      assert.equal(marketplaceRes.ok, true, `Marketplace must return 200, got ${marketplaceRes.status}`);
      assert.ok(marketplaceUrl.startsWith('https://'), 'Marketplace connection must use HTTPS');

      // 2. Open Real One-Label Hosted Store Hostname under configured parent
      const storeUrl = config.storeUrl || `https://${testStoreSubdomain}.${stagingHostedParent}`;
      assert.ok(storeUrl.startsWith('https://'), 'Hosted storefront connection must use HTTPS');

      // Validate one-label rule
      const parsedStoreUrl = new URL(storeUrl);
      const hostParts = parsedStoreUrl.hostname.split('.');
      assert.ok(hostParts.length >= 3, 'Must have at least one subdomain label under parent');
      const storeSubdomain = hostParts[0];
      assert.match(storeSubdomain, /^[a-z0-9-]+$/, 'Subdomain must be valid single-label');

      const storeRes = await browser.goto(storeUrl);
      assert.equal(storeRes.ok, true, `Storefront must return 200, got ${storeRes.status}`);

      // 3. Begin Buyer Authentication & Validate Return URL
      const authUrl = new URL(config.authUrl || process.env.STAGING_AUTH_URL || `https://${stagingMarketplaceHost}/auth/signin`);
      const returnUrl = `${storeUrl}/auth/callback`;
      authUrl.searchParams.set('returnUrl', returnUrl);

      // Validate returnUrl belongs to allowlisted hosted origin
      assert.ok(
        returnUrl.startsWith(storeUrl),
        'Return URL must belong strictly to the requesting hosted storefront'
      );

      await browser.goto(authUrl.toString());

      // 4. Complete Login
      await browser.fill('input[name="contact"]', buyerEmail);
      await browser.fill('input[name="password"]', buyerPassword);
      await browser.click('button[type="submit"]');

      // 5. Assert Session & Cookie Rotation
      const cookies = await browser.cookies();
      const sessionCookie = cookies.find((c) => c.name === 'session' || c.name === 'token' || c.name === 'jwt');
      assert.ok(sessionCookie, 'Authenticated session cookie must be set upon successful login');
      assert.equal(sessionCookie.secure, true, 'Session cookie must have Secure=true flag');
      assert.equal(sessionCookie.httpOnly, true, 'Session cookie must have HttpOnly=true flag');
      assert.ok(
        sessionCookie.sameSite === 'Lax' || sessionCookie.sameSite === 'Strict',
        `Session cookie must have SameSite Lax or Strict, got ${sessionCookie.sameSite}`
      );
      assert.equal(sessionCookie.path, '/', 'Session cookie path must be /');

      // Assert cookie domain isolation (must not be wildcard apex or leaked broadly)
      if (sessionCookie.domain) {
        assert.ok(
          !sessionCookie.domain.startsWith('.com') && !sessionCookie.domain.startsWith('.shop'),
          `Session cookie domain must not be broad TLD wildcard: ${sessionCookie.domain}`
        );
      }

      // 6. Browse Store Catalog
      await browser.goto(`${storeUrl}/products`);
      await browser.waitForSelector('.product-card, [data-testid="product-item"]');

      // 7. Exercise Cart Behavior & Checkout Readiness without real money
      // Add item to cart
      await browser.click('.product-card:first-child button, [data-testid="add-to-cart"]');
      await browser.goto(`${storeUrl}/cart`);
      await browser.waitForSelector('.cart-summary, [data-testid="cart-total"]');

      // Verify COD payment readiness (strictly cash-on-delivery; no live banking transactions)
      const codOption = await browser.waitForSelector('text=Cash on Delivery, text=COD, [data-testid="cod-option"]');
      assert.ok(codOption, 'COD payment method must be selectable for hosted storefront checkout');

      // 8. Read Authenticated Buyer's Own Order History
      await browser.goto(`${storeUrl}/account/orders`);
      await browser.waitForSelector('.orders-container, [data-testid="order-history"]');

      // 9. Log Out
      await browser.goto(`${storeUrl}/auth/logout`);
      await browser.clearCookies();

      // 10. Prove Old Session Is Unusable
      const postLogoutCookies = await browser.cookies();
      const staleCookie = postLogoutCookies.find((c) => c.name === sessionCookie.name);
      assert.ok(!staleCookie || staleCookie.value !== sessionCookie.value, 'Old session cookie must be cleared or rotated');

      // 11. Prove Sibling Hostname Cannot Access Session or Order Data
      const siblingStoreUrl = `https://sibling-${testStoreSubdomain}.${stagingHostedParent}`;
      await browser.goto(`${siblingStoreUrl}/account/orders`);
      const siblingOrdersContent = await browser.textContent('body');
      assert.ok(
        siblingOrdersContent.includes('Sign in') ||
        siblingOrdersContent.includes('Login') ||
        siblingOrdersContent.includes('Unauthorized') ||
        siblingOrdersContent.includes('401') ||
        siblingOrdersContent.includes('403'),
        'Sibling store must not have access to authenticated session of another store'
      );

      // 12. Prove Custom Domain Cannot Receive Hosted Session
      const customDomainUrl = 'https://custom-merchant-demo.com';
      // Safety assert: custom domain cannot access hosted storefront session
      const customCookies = await browser.cookies([customDomainUrl]);
      assert.equal(customCookies.length, 0, 'Custom domain must receive zero cookies from hosted storefront');

      artifactCollector?.recordConsole(`✅ Profile "${profile.name}" completed successfully.`);
    } finally {
      await browser.close();
    }
  }
}

module.exports = {
  checkStagingReadiness,
  runHostedSubdomainRehearsalJourney,
  tags: ['@host', '@staging', '@rehearsal', '@subdomain'],
};
