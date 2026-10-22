// tools/host-validator/test/validator.test.js
// Acceptance and unit test suite for Rentify host and deployment configuration validator.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const {
  validateHostConfig,
  ConfigurationValidationError,
  MANDATORY_RESERVED_SUBDOMAINS,
  isApprovedHostedSubdomain,
  isApprovedStorefrontOrigin,
  RELEASE_1_DECISIONS,
} = require('../index');

const stagingFixture = require('../../fixtures/config/staging.fixture');
const productionFixture = require('../../fixtures/config/production-safe.fixture');

test('P2-HOST-001 Acceptance: Valid staging configuration passes', () => {
  const result = validateHostConfig(stagingFixture, {
    targetEnv: 'staging',
    throwOnError: false,
  });

  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
  assert.ok(result.passedPolicies.length >= 7);
  assert.match(result.report, /Status\s+:\s+PASSED/);
});

test('P2-HOST-001 Acceptance: Valid production configuration passes', () => {
  const result = validateHostConfig(productionFixture, {
    targetEnv: 'production',
    throwOnError: false,
  });

  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
  assert.match(result.report, /Status\s+:\s+PASSED/);
});

test('P2-HOST-001 Acceptance: Unsafe HTTP production configuration fails', () => {
  const unsafeConfigs = [
    { ...productionFixture, MARKETPLACE_URL: 'http://rentifymarket.com' },
    { ...productionFixture, RENTIFY_API_URL: 'http://api.rentifymarket.com' },
    { ...productionFixture, AUTH_URL: 'http://auth.rentifymarket.com' },
    { ...productionFixture, ECOMMERCE_API_URL: 'http://commerce.rentifymarket.com' },
    { ...productionFixture, ADMIN_DASHBOARD_URL: 'http://admin.rentifymarket.com' },
  ];

  for (const cfg of unsafeConfigs) {
    const result = validateHostConfig(cfg, {
      targetEnv: 'production',
      throwOnError: false,
    });
    assert.equal(result.valid, false);
    const hasHttpError = result.errors.some((e) => e.policy === 'HTTPS Requirement' || e.message.includes('HTTPS'));
    assert.ok(hasHttpError, 'Should report HTTPS requirement failure');
  }

  // Throws ConfigurationValidationError when throwOnError is true
  assert.throws(
    () => {
      validateHostConfig({ ...productionFixture, MARKETPLACE_URL: 'http://rentifymarket.com' }, {
        targetEnv: 'production',
        throwOnError: true,
      });
    },
    (err) => {
      assert.ok(err instanceof ConfigurationValidationError);
      assert.match(err.message, /failed with \d+ error/);
      return true;
    }
  );
});

test('P2-HOST-001 Acceptance: Wildcard credentialed CORS fails', () => {
  const wildcardConfigs = [
    { ...productionFixture, CORS_ALLOWED_ORIGINS: '*' },
    { ...productionFixture, CORS_ALLOWED_ORIGINS: 'https://rentifymarket.com, *' },
    { ...productionFixture, CORS_ALLOWED_ORIGINS: 'null' },
    { ...productionFixture, CORS_ORIGINS: '*' },
  ];

  for (const cfg of wildcardConfigs) {
    const result = validateHostConfig(cfg, {
      targetEnv: 'production',
      throwOnError: false,
    });
    assert.equal(result.valid, false);
    const hasWildcardError = result.errors.some(
      (e) => e.policy === 'CORS Wildcard Prohibition' || e.message.includes('Wildcard origin')
    );
    assert.ok(hasWildcardError, 'Should reject wildcard CORS origin with credentials');
  }
});

test('P2-HOST-001 Acceptance: Unowned or malformed hosted parents fail', () => {
  const unownedParents = [
    'attacker.com',
    'rentifystore.com',
    'myshop.net',
    'https://rentifystore.shop', // scheme included is malformed
    'rentifystore.shop:443',      // port included is malformed
    'shop',                       // single label TLD
    '',                           // empty
  ];

  for (const parent of unownedParents) {
    const result = validateHostConfig({ ...productionFixture, HOSTED_STOREFRONT_DOMAIN: parent }, {
      targetEnv: 'production',
      throwOnError: false,
    });
    assert.equal(result.valid, false, `Parent "${parent}" should fail production validation`);
    const hasParentError = result.errors.some(
      (e) => e.policy === 'Owned Hosted Parent (DEC-002)' || e.field === 'HOSTED_STOREFRONT_DOMAIN'
    );
    assert.ok(hasParentError, `Expected parent domain error for "${parent}"`);
  }
});

test('P2-HOST-001 Acceptance: Reserved subdomains fail as storefront origins', () => {
  const mandatoryReserved = [
    'admin',
    'api',
    'auth',
    'billing',
    'checkout',
    'mail',
    'marketplace',
    'support',
  ];

  for (const name of mandatoryReserved) {
    // Assert helper rejects it
    const check = isApprovedHostedSubdomain(name);
    assert.equal(check.valid, false, `Subdomain "${name}" must be rejected as reserved`);
    assert.match(check.error, /reserved system name/);

    // Origin check rejects it
    const originCheck = isApprovedStorefrontOrigin(`https://${name}.rentifystore.shop`, 'rentifystore.shop');
    assert.equal(originCheck, false, `Origin https://${name}.rentifystore.shop must be rejected`);
  }

  // Multi-label subdomains fail
  assert.equal(isApprovedHostedSubdomain('sub.store').valid, false);
  // Invalid characters fail
  assert.equal(isApprovedHostedSubdomain('-store').valid, false);
  assert.equal(isApprovedHostedSubdomain('store-').valid, false);
  assert.equal(isApprovedHostedSubdomain('ab').valid, false); // < 3 chars

  // Approved single-label subdomain passes
  assert.equal(isApprovedHostedSubdomain('aura-botanicals').valid, true);
  assert.equal(isApprovedStorefrontOrigin('https://aura-botanicals.rentifystore.shop', 'rentifystore.shop'), true);
});

test('P2-HOST-001 Acceptance: Unsafe return URLs fail', () => {
  const unsafeReturnUrls = [
    'https://evil-attacker.com/steal-token',
    '//attacker.com/open-redirect',
    '/relative/path/only',
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'http://rentifymarket.com/insecure', // non-HTTPS in production
    'http://localhost:4300/callback',    // localhost in production
  ];

  for (const url of unsafeReturnUrls) {
    const result = validateHostConfig({ ...productionFixture, AUTH_RETURN_URL_ALLOWLIST: url }, {
      targetEnv: 'production',
      throwOnError: false,
    });
    assert.equal(result.valid, false, `Return URL "${url}" must be rejected in production`);
    const hasReturnUrlError = result.errors.some(
      (e) => e.field === 'AUTH_RETURN_URL_ALLOWLIST' || e.policy.includes('Return URL')
    );
    assert.ok(hasReturnUrlError, `Expected return URL error for "${url}"`);
  }
});

test('P2-HOST-001 Acceptance: Incompatible feature flags fail', () => {
  // 1. CutLuy enabled in production or staging (DEC-027)
  const cutluyProd = validateHostConfig({ ...productionFixture, CUTLUY_ENABLED: 'true' }, {
    targetEnv: 'production',
    throwOnError: false,
  });
  assert.equal(cutluyProd.valid, false);
  assert.ok(cutluyProd.errors.some((e) => e.policy === 'CutLuy Release 1 Policy (DEC-027)'));

  const cutluyStaging = validateHostConfig({ ...stagingFixture, CUTLUY_ENABLED: 'true' }, {
    targetEnv: 'staging',
    throwOnError: false,
  });
  assert.equal(cutluyStaging.valid, false);
  assert.ok(cutluyStaging.errors.some((e) => e.policy === 'CutLuy Release 1 Policy (DEC-027)'));

  // 2. Developer auto-approval enabled in production (DEC-007)
  const autoApproval = validateHostConfig({ ...productionFixture, DEV_MARKETPLACE_AUTO_APPROVAL: 'true' }, {
    targetEnv: 'production',
    throwOnError: false,
  });
  assert.equal(autoApproval.valid, false);
  assert.ok(autoApproval.errors.some((e) => e.policy === 'Seller Moderation Policy (DEC-007)'));

  // 3. Custom domain checkout enabled in production (DEC-003)
  const customDomainCheckout = validateHostConfig({ ...productionFixture, CUSTOM_DOMAIN_CHECKOUT_ENABLED: 'true' }, {
    targetEnv: 'production',
    throwOnError: false,
  });
  assert.equal(customDomainCheckout.valid, false);
  assert.ok(customDomainCheckout.errors.some((e) => e.policy === 'Custom Domain Scope (DEC-003)'));

  // 4. COD disabled in production (DEC-026)
  const codDisabled = validateHostConfig({ ...productionFixture, MARKETPLACE_COD_CHECKOUT_ENABLED: 'false' }, {
    targetEnv: 'production',
    throwOnError: false,
  });
  assert.equal(codDisabled.valid, false);
  assert.ok(codDisabled.errors.some((e) => e.policy === 'Release 1 Accepted Payment Method (DEC-026)'));
});

test('P2-HOST-001 Acceptance: No credential value appears in output or logs', () => {
  const rawSecret = 'SUPER_SECRET_VALUE_DO_NOT_LEAK_ME_12345';
  const weakSecret = 'password';

  const cfg = {
    ...productionFixture,
    JWT_SECRET: rawSecret,
    SESSION_SECRET: weakSecret,
    DB_PASSWORD: 'test',
  };

  const result = validateHostConfig(cfg, {
    targetEnv: 'production',
    throwOnError: false,
  });

  // Verify that the secret values do NOT appear in the report
  assert.equal(result.report.includes(rawSecret), false, 'Raw secret must not appear in report');
  assert.equal(result.report.includes(weakSecret), false, 'Weak secret string must not appear in report');

  // Verify errors array does not leak the secret values
  for (const err of result.errors) {
    assert.equal(JSON.stringify(err).includes(rawSecret), false, 'Error object must not contain secret');
    assert.equal(JSON.stringify(err).includes(weakSecret), false, 'Error object must not contain weak secret');
  }

  // Formatted report contains safe redaction text
  assert.match(result.report, /Zero-Credential Guarantee/);
});

test('P2-HOST-001 Security: Cookie domain broad wildcard is rejected', () => {
  const broadCookieDomains = [
    'rentifystore.shop',
    '.rentifystore.shop',
    '.shop',
    '.com',
  ];

  for (const domain of broadCookieDomains) {
    const result = validateHostConfig({ ...productionFixture, COOKIE_DOMAIN: domain }, {
      targetEnv: 'production',
      throwOnError: false,
    });
    assert.equal(result.valid, false, `COOKIE_DOMAIN "${domain}" should be rejected`);
    assert.ok(result.errors.some((e) => e.policy === 'Cookie Domain Isolation'));
  }
});

test('P2-HOST-001 Security: Insecure cookie flags in production are rejected', () => {
  const insecureFlags = [
    { ...productionFixture, COOKIE_SECURE: 'false' },
    { ...productionFixture, COOKIE_HTTP_ONLY: 'false' },
    { ...productionFixture, COOKIE_SAMESITE: 'None', COOKIE_SECURE: 'false' },
  ];

  for (const cfg of insecureFlags) {
    const result = validateHostConfig(cfg, {
      targetEnv: 'production',
      throwOnError: false,
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.policy === 'Cookie Security Flags'));
  }
});

test('P2-HOST-001 Security: Localhost in production configuration is rejected', () => {
  const localhostVariants = [
    { ...productionFixture, MARKETPLACE_URL: 'https://localhost' },
    { ...productionFixture, AUTH_URL: 'https://127.0.0.1:4300' },
    { ...productionFixture, CORS_ALLOWED_ORIGINS: 'https://rentifymarket.com,http://localhost:3001' },
    { ...productionFixture, AUTH_RETURN_URL_ALLOWLIST: 'https://rentifymarket.com,http://localhost:4400' },
  ];

  for (const cfg of localhostVariants) {
    const result = validateHostConfig(cfg, {
      targetEnv: 'production',
      throwOnError: false,
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.policy === 'Localhost Prohibition in Production'));
  }
});

test('P2-HOST-001 Security: Missing and short secrets in production are rejected', () => {
  const missingSecrets = { ...productionFixture, JWT_SECRET: '' };
  const shortSecrets = { ...productionFixture, JWT_SECRET: 'short_secret_under_32_chars' };

  const resMissing = validateHostConfig(missingSecrets, { targetEnv: 'production', throwOnError: false });
  assert.equal(resMissing.valid, false);
  assert.ok(resMissing.errors.some((e) => e.policy === 'Secret Presence' && e.field === 'JWT_SECRET'));

  const resShort = validateHostConfig(shortSecrets, { targetEnv: 'production', throwOnError: false });
  assert.equal(resShort.valid, false);
  assert.ok(resShort.errors.some((e) => e.policy === 'Secret Strength' && e.field === 'JWT_SECRET'));
});

test('P2-HOST-001 CLI: CLI commands execute and return correct exit codes', () => {
  const cliPath = path.resolve(__dirname, '../../validate-host-config.js');

  // 1. Fixture production passes with exit code 0
  const prodOut = execFileSync(process.execPath, [cliPath, '--fixture', 'production'], { encoding: 'utf8' });
  assert.match(prodOut, /Status\s+:\s+PASSED/);

  // 2. Fixture staging passes with exit code 0
  const stagingOut = execFileSync(process.execPath, [cliPath, '--fixture', 'staging'], { encoding: 'utf8' });
  assert.match(stagingOut, /Status\s+:\s+PASSED/);

  // 3. JSON flag returns valid parsed JSON
  const jsonOut = execFileSync(process.execPath, [cliPath, '--fixture', 'production', '--json'], { encoding: 'utf8' });
  const parsedJson = JSON.parse(jsonOut);
  assert.equal(parsedJson.valid, true);
  assert.equal(parsedJson.targetEnv, 'production');

  // 4. Default execution (no arguments) verifies repository fixtures
  const defaultOut = execFileSync(process.execPath, [cliPath], { encoding: 'utf8' });
  assert.match(defaultOut, /PASSED \(2\/2 fixtures verified\)/);
});
