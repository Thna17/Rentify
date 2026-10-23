// tools/e2e/safety.js - Guardrails ensuring E2E tests run only in safe test environments

const { assertSafeTestEnvironment, UnsafeEnvironmentError } = require('../fixtures/safety');

const FORBIDDEN_URL_PATTERNS = [
  /\brentifymarket\.com\b/i,
  /\brentify\.com\b/i,
  /\bmekhla\.digital\b/i,
  /\bamazonaws\.com\b/i,
  /\bazure\.com\b/i,
  /\bgoogle\.com\b/i,
  /\bprod\b/i,
  /\blive\b/i,
];

/**
 * Validates that an HTTP URL targets local, safe test server endpoints.
 * Throws UnsafeEnvironmentError if production, remote, or cloud hostnames are detected.
 *
 * @param {string} urlString
 * @returns {URL} Parsed URL
 */
function assertSafeUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') {
    throw new UnsafeEnvironmentError('Missing or invalid URL provided to test harness.');
  }

  let parsed;
  try {
    parsed = new URL(urlString);
  } catch (err) {
    throw new UnsafeEnvironmentError(`Invalid URL string: "${urlString}"`, { error: err.message });
  }

  for (const pattern of FORBIDDEN_URL_PATTERNS) {
    if (process.env.ALLOW_STAGING_REHEARSAL === 'true') {
      const isStagingMatch =
        parsed.hostname === 'staging.rentifymarket.com' ||
        parsed.hostname.endsWith('.rentifystore.shop') ||
        parsed.hostname.endsWith('.staging.rentifystore.shop');
      if (isStagingMatch) {
        continue;
      }
    }

    if (pattern.test(parsed.hostname)) {
      throw new UnsafeEnvironmentError(
        `Refusing to execute E2E test against production or public host: "${parsed.hostname}". Tests must target local loopback addresses (127.0.0.1 or localhost).`,
        { hostname: parsed.hostname, url: urlString }
      );
    }
  }

  // Allow authorized staging hostnames during explicit staging rehearsal
  if (process.env.ALLOW_STAGING_REHEARSAL === 'true') {
    const isAllowedStagingHost =
      parsed.hostname === 'staging.rentifymarket.com' ||
      parsed.hostname.endsWith('.rentifystore.shop') ||
      parsed.hostname.endsWith('.staging.rentifystore.shop');
    if (isAllowedStagingHost) {
      return parsed;
    }
  }

  // Must be loopback in E2E tests
  const isLoopback =
    parsed.hostname === '127.0.0.1' ||
    parsed.hostname === 'localhost' ||
    parsed.hostname === '::1' ||
    parsed.hostname === '0.0.0.0';

  if (!isLoopback) {
    throw new UnsafeEnvironmentError(
      `Non-loopback host detected: "${parsed.hostname}". E2E test harness strictly requires localhost or 127.0.0.1.`,
      { hostname: parsed.hostname, url: urlString }
    );
  }

  return parsed;
}

/**
 * Validates complete safety of the test execution environment before starting servers or tests.
 *
 * @param {object} [options]
 */
function assertSafeE2EEnvironment(options = {}) {
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';

  // 1. Check database & runtime safety via shared fixture rules
  assertSafeTestEnvironment({ database: 'rentify_core_test', ...options });

  // 2. Enforce NODE_ENV !== 'production'
  if (process.env.NODE_ENV === 'production') {
    throw new UnsafeEnvironmentError('NODE_ENV cannot be production during E2E test execution.');
  }

  // 3. Verify target URLs if set in environment
  const targetEnvVars = [
    'RENTIFY_API_URL',
    'ECOMMERCE_API_URL',
    'AUTH_URL',
    'MERCHANT_DASHBOARD_URL',
    'MARKETPLACE_URL',
    'STOREFRONT_ORIGIN',
  ];

  for (const key of targetEnvVars) {
    const val = process.env[key];
    if (val && !val.includes('.test') && !val.includes('.invalid') && !val.includes('.local')) {
      try {
        assertSafeUrl(val);
      } catch (err) {
        throw new UnsafeEnvironmentError(
          `Environment variable ${key} points to an unsafe URL: "${val}". ${err.message}`,
          { variable: key, value: val }
        );
      }
    }
  }

  return { safe: true, nodeEnv: process.env.NODE_ENV || 'test' };
}

module.exports = {
  assertSafeUrl,
  assertSafeE2EEnvironment,
  assertSafeTestEnvironment,
  UnsafeEnvironmentError,
};
