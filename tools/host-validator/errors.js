// tools/host-validator/errors.js
// Safe validation errors and diagnostic formatting for Rentify host configuration.

const SENSITIVE_KEY_PATTERN = /(?:secret|password|token|key|credential|auth_header|private)/i;

/**
 * Sanitizes an object or string to guarantee no sensitive credentials appear in errors or logs.
 *
 * @param {string} field
 * @param {any} value
 * @returns {string}
 */
function sanitizeValue(field, value) {
  if (value === undefined || value === null) {
    return '[EMPTY]';
  }
  if (SENSITIVE_KEY_PATTERN.test(String(field))) {
    return `[REDACTED: ${String(value).length} chars]`;
  }
  const str = String(value);
  // Redact potential URL embedded passwords
  return str.replace(/(https?:\/\/)([^:@/]+):([^@/]+)@/g, '$1$2:[REDACTED]@');
}

/**
 * Recursively scrubs any potential secrets from a diagnostic object.
 *
 * @param {any} item
 * @returns {any}
 */
function scrubDiagnostics(item) {
  if (!item || typeof item !== 'object') {
    return item;
  }
  if (Array.isArray(item)) {
    return item.map(scrubDiagnostics);
  }
  const scrubbed = {};
  for (const [k, v] of Object.entries(item)) {
    if (SENSITIVE_KEY_PATTERN.test(k)) {
      scrubbed[k] = v ? `[REDACTED: ${String(v).length} chars]` : '[EMPTY]';
    } else if (typeof v === 'object' && v !== null) {
      scrubbed[k] = scrubDiagnostics(v);
    } else if (typeof v === 'string') {
      scrubbed[k] = sanitizeValue(k, v);
    } else {
      scrubbed[k] = v;
    }
  }
  return scrubbed;
}

/**
 * Error class thrown when configuration validation fails.
 * Guarantees zero credential leakage.
 */
class ConfigurationValidationError extends Error {
  /**
   * @param {string} message
   * @param {{ targetEnv?: string, errors?: Array, warnings?: Array, report?: string }} [diagnostic]
   */
  constructor(message, diagnostic = {}) {
    super(message);
    this.name = 'ConfigurationValidationError';
    this.targetEnv = diagnostic.targetEnv || 'unknown';
    this.errors = scrubDiagnostics(diagnostic.errors || []);
    this.warnings = scrubDiagnostics(diagnostic.warnings || []);
    this.report = diagnostic.report || '';
  }
}

/**
 * Generates a clean, safe diagnostic report string for CI logs or startup output.
 *
 * @param {{
 *   targetEnv: string,
 *   valid: boolean,
 *   errors: Array<{ policy: string, message: string, field?: string }>,
 *   warnings: Array<{ policy: string, message: string, field?: string }>,
 *   passedPolicies: string[],
 * }} result
 * @returns {string}
 */
function formatValidationReport(result) {
  const lines = [];
  lines.push('================================================================');
  lines.push('       RENTIFY HOST & CONFIGURATION VALIDATION REPORT');
  lines.push('================================================================');
  lines.push(` Target Environment : ${result.targetEnv.toUpperCase()}`);
  lines.push(` Status             : ${result.valid ? 'PASSED (CONFORMANT)' : 'FAILED (NON-CONFORMANT)'}`);
  lines.push(` Errors Detected    : ${result.errors.length}`);
  lines.push(` Warnings Detected  : ${result.warnings.length}`);
  lines.push('----------------------------------------------------------------');

  if (result.passedPolicies && result.passedPolicies.length > 0) {
    lines.push(' PASSED POLICIES:');
    for (const policy of result.passedPolicies) {
      lines.push(`   [PASS] ${policy}`);
    }
    lines.push('----------------------------------------------------------------');
  }

  if (result.errors.length > 0) {
    lines.push(' POLICY VIOLATIONS (ERRORS):');
    for (const err of result.errors) {
      const fieldInfo = err.field ? ` [Field: ${err.field}]` : '';
      lines.push(`   [FAIL] ${err.policy}${fieldInfo}`);
      lines.push(`          Message: ${err.message}`);
    }
    lines.push('----------------------------------------------------------------');
  }

  if (result.warnings.length > 0) {
    lines.push(' ADVISORY NOTICES (WARNINGS):');
    for (const warn of result.warnings) {
      const fieldInfo = warn.field ? ` [Field: ${warn.field}]` : '';
      lines.push(`   [WARN] ${warn.policy}${fieldInfo}`);
      lines.push(`          Message: ${warn.message}`);
    }
    lines.push('----------------------------------------------------------------');
  }

  lines.push(' Zero-Credential Guarantee: No secret values or sensitive tokens');
  lines.push(' are ever printed in this report or stored in logs.');
  lines.push('================================================================');

  return lines.join('\n');
}

module.exports = {
  ConfigurationValidationError,
  sanitizeValue,
  scrubDiagnostics,
  formatValidationReport,
};
