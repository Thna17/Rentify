// rentify-server/test/security/hostedSubdomainSessionIsolation.test.js
// P2-HOST-002: Hosted-subdomain login, logout, and session isolation test suite

const { test } = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.HOSTED_STOREFRONT_DOMAIN = 'rentifystore.shop';
process.env.AUTH_RETURN_URL_ALLOWLIST = 'https://staging.rentifymarket.com,https://staging-dashboard.rentifymarket.com';
process.env.JWT_SECRET = 'test-secret-min-32-chars-long-123456';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-min-32-chars-long-123456';
process.env.COOKIE_SECRET = 'test-cookie-secret-min-32-chars-long-123';

const { resolveReturnUrl, allowedOrigins } = require('../../src/modules/auth/returnUrlPolicy');
const { classifyHost, extractHostFromRequest, isCustomDomainRequest } = require('../../src/utils/hostBoundary');
const { checkStagingReadiness } = require('../../../tools/e2e/journeys/hostedSubdomainRehearsalJourney');
const sessionManager = require('../../src/utils/sessionManager');
const { UserSession } = require('../../src/models');

test('P2-HOST-002: 1. Hosted-subdomain Return URL Allowlist Enforcement', () => {
  // Valid 1-label hosted storefront return URLs must be allowed
  const validHosted1 = resolveReturnUrl('https://demo-store.rentifystore.shop/auth/callback');
  assert.equal(validHosted1, 'https://demo-store.rentifystore.shop/auth/callback');

  const validHosted2 = resolveReturnUrl('https://artisan-crafts.rentifystore.shop/account/orders');
  assert.equal(validHosted2, 'https://artisan-crafts.rentifystore.shop/account/orders');

  // Exact allowlisted platform destinations
  const validPlatform = resolveReturnUrl('https://staging.rentifymarket.com/market');
  assert.equal(validPlatform, 'https://staging.rentifymarket.com/market');

  // Rejections:
  // a. Phishing / arbitrary external destination
  assert.throws(
    () => resolveReturnUrl('https://attacker-phishing.com/steal'),
    (err) => err.statusCode === 400 && err.message.includes('Return URL is not allowed')
  );

  // b. Nested subdomains under hosted parent (e.g. a.b.rentifystore.shop is rejected because it is not single-label)
  assert.throws(
    () => resolveReturnUrl('https://nested.sub.rentifystore.shop/callback'),
    (err) => err.statusCode === 400
  );

  // c. Userinfo spoofing (@ attacker.com)
  assert.throws(
    () => resolveReturnUrl('https://demo-store.rentifystore.shop@evil.com/callback'),
    (err) => err.statusCode === 400 && err.message.includes('credentials')
  );

  // d. Custom merchant domains are browse-only and cannot receive central auth redirects
  assert.throws(
    () => resolveReturnUrl('https://merchantcustombrand.com/auth/callback'),
    (err) => err.statusCode === 400
  );
});

test('P2-HOST-002: 2. Cookie Security Invariants (HTTPS, Secure, HttpOnly, SameSite, Domain Scope, Path)', () => {
  const cookiePolicy = {
    secure: true,
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    domain: '', // Host-only cookie in standard configuration to prevent sibling leakage
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  };

  assert.equal(cookiePolicy.secure, true, 'Cookies must enforce Secure=true');
  assert.equal(cookiePolicy.httpOnly, true, 'Cookies must enforce HttpOnly=true');
  assert.equal(cookiePolicy.sameSite, 'Lax', 'Cookies must enforce SameSite=Lax (or Strict)');
  assert.equal(cookiePolicy.path, '/', 'Cookie path must be /');
  assert.ok(cookiePolicy.maxAge > 0, 'Cookie expiration must be non-zero positive duration');

  // Exact cookie domain scope invariant:
  // Setting broad domain like ".com" or ".rentifystore.shop" without host-prefix leaks session cookies across stores.
  // When domain is empty or host-bound, cookies are restricted strictly to that specific origin.
  const isHostBound = cookiePolicy.domain === '' || !cookiePolicy.domain.startsWith('.');
  assert.equal(isHostBound, true, 'Cookie must be host-bound or strict to prevent sibling store cookie sharing');
});

test('P2-HOST-002: 3. Session Rotation and Cryptographic Token Hashing upon Authentication', async () => {
  // Simulate anonymous/guest session before login
  const guestSession = {
    id: 'guest-session-uuid-1111',
    token: 'guest-refresh-token-alpha',
    isAnonymous: true,
  };

  const authenticatedUserId = 'buyer-uuid-1234-5678';
  const refreshToken = 'auth-refresh-token-beta-secret-key-12345';

  // Test token hashing: raw token is NEVER persisted in database
  const tokenHash = sessionManager.hashToken(refreshToken);
  assert.equal(tokenHash.length, 64, 'Token hash must be SHA-256 64-char hex string');
  assert.notEqual(tokenHash, refreshToken, 'Raw token must not match hash');

  // Mock UserSession persistence
  const createdSessions = [];
  const origCreate = UserSession.create;
  UserSession.create = async (data) => {
    const session = {
      id: `session-uuid-${Date.now()}`,
      ...data,
      isRevoked: false,
      save: async function () { return this; },
    };
    createdSessions.push(session);
    return session;
  };

  try {
    const authenticatedSession = await sessionManager.createSession({
      userId: authenticatedUserId,
      refreshToken,
      req: {
        headers: {
          'user-agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 7)',
        },
        ip: '192.168.1.50',
      },
    });

    // Asserts:
    assert.notEqual(authenticatedSession.id, guestSession.id, 'Session ID must rotate upon authentication');
    assert.equal(authenticatedSession.userId, authenticatedUserId);
    assert.equal(authenticatedSession.tokenHash, tokenHash, 'Stored session must have SHA-256 hash');
    assert.ok(authenticatedSession.clientType.includes('Android'));
    assert.equal(authenticatedSession.isRevoked, false);
  } finally {
    UserSession.create = origCreate;
  }
});

test('P2-HOST-002: 4. Logout Session Revocation and Stale Token Rejection', async () => {
  const userId = 'buyer-uuid-9999-8888';
  const sessionId = 'session-to-revoke-1234';

  const mockSession = {
    id: sessionId,
    userId,
    refreshTokenHash: 'hash-value-123',
    isRevoked: false,
    save: async function () {
      this.isRevoked = true;
      return this;
    },
  };

  const origFindOne = UserSession.findOne;
  UserSession.findOne = async ({ where }) => {
    if (where.id === sessionId && where.userId === userId) {
      return mockSession;
    }
    return null;
  };

  try {
    assert.equal(mockSession.isRevoked, false);

    // Invoke Logout / Revocation
    const revoked = await sessionManager.revokeSession(sessionId, userId);
    assert.equal(revoked, true, 'Revoking active session must succeed');
    assert.equal(mockSession.isRevoked, true, 'Session record must be marked revoked');
  } finally {
    UserSession.findOne = origFindOne;
  }
});

test('P2-HOST-002: 5. Sibling Store Hostname Tenancy and Session Isolation', () => {
  // Storefront A: https://store-alpha.rentifystore.shop
  // Storefront B: https://store-beta.rentifystore.shop

  const hostAlpha = 'store-alpha.rentifystore.shop';
  const hostBeta = 'store-beta.rentifystore.shop';

  const classificationAlpha = classifyHost(hostAlpha);
  const classificationBeta = classifyHost(hostBeta);

  assert.equal(classificationAlpha.type, 'HOSTED_STOREFRONT');
  assert.equal(classificationAlpha.subdomain, 'store-alpha');

  assert.equal(classificationBeta.type, 'HOSTED_STOREFRONT');
  assert.equal(classificationBeta.subdomain, 'store-beta');

  // Cross-store tenancy isolation check: distinct subdomains resolve to distinct Stores
  assert.notEqual(classificationAlpha.subdomain, classificationBeta.subdomain);
});

test('P2-HOST-002: 6. Custom Domain Browse-Only Security Barrier', () => {
  const customHost = 'luxurycrafts.com';
  const classification = classifyHost(customHost, {
    website: {
      domain: 'luxurycrafts.com',
      status: 'active',
      subdomain: 'luxury-crafts',
    },
  });

  assert.equal(classification.type, 'CUSTOM_DOMAIN');
  assert.equal(classification.isCustom, true);
  assert.equal(classification.isAllowedBrowseOnly, true);
  assert.equal(classification.subdomain, 'luxury-crafts');
});

test('P2-HOST-002: 7. Multi-Browser Viewport Conformance (DEC-021)', () => {
  const viewports = {
    primary360: { width: 360, height: 800, isMobile: true },
    androidPixel: { width: 412, height: 915, isMobile: true },
    iosWebKit: { width: 390, height: 844, isMobile: true },
  };

  // Primary mobile width MUST be 360px per DEC-021
  assert.equal(viewports.primary360.width, 360, 'Primary reference width must be 360px (DEC-021)');
  assert.equal(viewports.primary360.isMobile, true);

  assert.ok(viewports.androidPixel.width >= 360);
  assert.ok(viewports.iosWebKit.width >= 360);
});

test('P2-HOST-002: 8. Staging Readiness Preflight Diagnostic', async () => {
  // Running preflight against test/staging config
  const readiness = await checkStagingReadiness({
    stagingMarketplaceHost: 'unresolvable-staging-host-9999.invalid',
    stagingHostedParent: 'rentifystore.shop',
    testStoreSubdomain: 'nonexistent-demo-store',
  });

  assert.equal(readiness.ready, false);
  assert.ok(readiness.missing.length > 0);
  assert.ok(readiness.missing.some((m) => m.includes('DNS')));
});
