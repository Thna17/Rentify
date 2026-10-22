// tools/host-validator/index.js
// Main entry point for Rentify production host & configuration validation.

const {
  ConfigurationValidationError,
  formatValidationReport,
  sanitizeValue,
  scrubDiagnostics,
} = require('./errors');

const {
  MANDATORY_RESERVED_SUBDOMAINS,
  RESERVED_SUBDOMAIN_SET,
  RELEASE_1_DECISIONS,
  isApprovedHostedSubdomain,
  isApprovedStorefrontOrigin,
  checkEnvironmentSeparation,
  checkPublicOrigins,
  checkHostedParent,
  checkCookiePolicy,
  checkCorsAllowlists,
  checkAuthReturnUrls,
  checkFeatureFlags,
  checkSecretPresence,
} = require('./policies');

/**
 * Validates a configuration dictionary against Release 1 host and operational policies.
 *
 * @param {Record<string, string | undefined>} envOrConfig
 * @param {{
 *   targetEnv?: 'production' | 'staging' | 'development' | 'test',
 *   throwOnError?: boolean,
 *   logger?: (msg: string) => void,
 * }} [options]
 * @returns {{
 *   valid: boolean,
 *   targetEnv: string,
 *   errors: Array<{ policy: string, message: string, field?: string }>,
 *   warnings: Array<{ policy: string, message: string, field?: string }>,
 *   passedPolicies: string[],
 *   report: string,
 *   summary: { totalErrors: number, totalWarnings: number, passedCount: number },
 * }}
 */
function validateHostConfig(envOrConfig = {}, options = {}) {
  const env = { ...envOrConfig };
  const targetEnv = (options.targetEnv || env.NODE_ENV || 'production').trim().toLowerCase();

  const report = {
    targetEnv,
    errors: [],
    warnings: [],
    passedPolicies: [],
  };

  // Run all policy checks
  const runCheck = (policyName, fn) => {
    const errorCountBefore = report.errors.length;
    fn(env, targetEnv, report);
    if (report.errors.length === errorCountBefore) {
      report.passedPolicies.push(policyName);
    }
  };

  runCheck('Environment Separation & Localhost Prohibition', checkEnvironmentSeparation);
  runCheck('Public Service Origins (HTTPS & Canonical Domains)', checkPublicOrigins);
  runCheck('Owned Hosted Storefront Parent (rentifystore.shop)', checkHostedParent);
  runCheck('Cookie Domain Isolation & Security Flags', checkCookiePolicy);
  runCheck('Credentialed CORS Allowlists & Wildcard Prohibition', checkCorsAllowlists);
  runCheck('Auth Return URL Allowlist & Open Redirect Defense', checkAuthReturnUrls);
  runCheck('Feature Flag Compatibility (CutLuy, COD, Custom Domains, Seller KYC)', checkFeatureFlags);
  runCheck('Secret Presence & Zero-Credential Diagnostic', checkSecretPresence);

  const valid = report.errors.length === 0;
  const formattedReport = formatValidationReport({
    targetEnv,
    valid,
    errors: report.errors,
    warnings: report.warnings,
    passedPolicies: report.passedPolicies,
  });

  const result = {
    valid,
    targetEnv,
    errors: report.errors,
    warnings: report.warnings,
    passedPolicies: report.passedPolicies,
    report: formattedReport,
    summary: {
      totalErrors: report.errors.length,
      totalWarnings: report.warnings.length,
      passedCount: report.passedPolicies.length,
    },
  };

  if (options.logger && typeof options.logger === 'function') {
    options.logger(formattedReport);
  }

  if (!valid && options.throwOnError !== false) {
    throw new ConfigurationValidationError(
      `Rentify host configuration validation failed with ${report.errors.length} error(s) for target "${targetEnv}"`,
      { targetEnv, errors: report.errors, warnings: report.warnings, report: formattedReport }
    );
  }

  return result;
}

/**
 * Validates the current running Node environment (`process.env`).
 *
 * @param {object} [options]
 */
function validateEnvironment(options = {}) {
  return validateHostConfig(process.env, options);
}

module.exports = {
  validateHostConfig,
  validateEnvironment,
  ConfigurationValidationError,
  formatValidationReport,
  sanitizeValue,
  scrubDiagnostics,
  MANDATORY_RESERVED_SUBDOMAINS,
  RESERVED_SUBDOMAIN_SET,
  RELEASE_1_DECISIONS,
  isApprovedHostedSubdomain,
  isApprovedStorefrontOrigin,
};
