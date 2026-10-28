'use strict';

// tools/reconciliation/report.js
// P3-REC-001: Machine-readable JSON and concise human summary formatters.

const { VERDICTS, DOMAIN_STATUS } = require('./constants');
const { redactSensitiveData } = require('./safety');

/**
 * Produces clean, redacted, machine-readable JSON for audit results.
 *
 * @param {object} auditResult
 * @returns {string} Formatted JSON
 */
function formatMachineReadableJson(auditResult) {
  const cleanPayload = redactSensitiveData(auditResult);
  return JSON.stringify(cleanPayload, null, 2);
}

/**
 * Formats a concise, operator-friendly human summary report.
 *
 * @param {object} auditResult
 * @returns {string} Text summary
 */
function formatHumanSummary(auditResult) {
  const {
    runId,
    timestamp,
    scope,
    verdict,
    summary,
    domains = [],
  } = auditResult;

  const lines = [];
  lines.push('================================================================================');
  lines.push('RENTIFY CONTINUOUS COMMERCE RECONCILIATION AUDIT');
  lines.push('================================================================================');
  lines.push(`Run ID:    ${runId}`);
  lines.push(`Timestamp: ${timestamp}`);
  lines.push(`Scope:     ${scope.type === 'store' ? `STORE (${scope.storeId})` : 'PLATFORM-WIDE'}`);
  lines.push(`Verdict:   ${verdict === VERDICTS.PASS ? 'PASS' : 'FAIL - UNEXPLAINED DIFFERENCES DETECTED'}`);
  lines.push(`Inspected: ${summary.totalRecordsInspected} records across ${summary.totalDomainsAudited} domains`);
  lines.push('');
  lines.push('--------------------------------------------------------------------------------');
  lines.push('DOMAIN BREAKDOWN');
  lines.push('--------------------------------------------------------------------------------');

  const statusLabel = {
    [DOMAIN_STATUS.PROVEN_ZERO_DIFFERENCES]: '[PROVEN ZERO DIFFERENCES]',
    [DOMAIN_STATUS.ZERO_DATA_NO_EVIDENCE]:   '[ZERO DATA - NO EVIDENCE]',
    [DOMAIN_STATUS.EXPLAINED_DIFFERENCE]:     '[EXPLAINED DIFFERENCE]   ',
    [DOMAIN_STATUS.UNEXPLAINED_DIFFERENCE]:   '[UNEXPLAINED DIFFERENCE] ',
  };

  domains.forEach((dom, idx) => {
    const num = String(idx + 1).padStart(2, ' ');
    const tag = statusLabel[dom.status] || `[${dom.status}]`;
    const namePadded = dom.name.padEnd(36, ' ');
    const countInfo = `(${dom.recordsInspected} inspected${dom.defectsCount > 0 ? `, ${dom.defectsCount} defects` : ''})`;
    lines.push(`${num}. ${namePadded} ${tag} ${countInfo}`);
  });

  lines.push('');
  lines.push('--------------------------------------------------------------------------------');
  lines.push('STATUS SUMMARY');
  lines.push('--------------------------------------------------------------------------------');
  lines.push(`  - Proven zero differences: ${summary.provenZeroDifferencesCount}`);
  lines.push(`  - Zero-data / no evidence: ${summary.zeroDataCount}`);
  lines.push(`  - Explained differences:   ${summary.explainedDifferencesCount}`);
  lines.push(`  - Unexplained differences: ${summary.unexplainedDifferencesCount}`);
  lines.push('');

  // Operator guidance for non-zero domains
  const problematicDomains = domains.filter(
    (d) => d.status === DOMAIN_STATUS.UNEXPLAINED_DIFFERENCE || d.status === DOMAIN_STATUS.EXPLAINED_DIFFERENCE
  );

  if (problematicDomains.length > 0) {
    lines.push('--------------------------------------------------------------------------------');
    lines.push('OPERATOR GUIDANCE & FINDINGS');
    lines.push('--------------------------------------------------------------------------------');

    for (const d of problematicDomains) {
      const isCritical = d.status === DOMAIN_STATUS.UNEXPLAINED_DIFFERENCE;
      const icon = isCritical ? '❌ CRITICAL' : 'ℹ️ EXPLAINED';
      lines.push(`${icon} Domain: ${d.name}`);
      lines.push(`   Suggested Package: ${d.suggestedOwningPackage}`);
      lines.push(`   Guidance:          ${d.operatorGuidance}`);
      if (d.sampledSafeIdentifiers && d.sampledSafeIdentifiers.length > 0) {
        lines.push(`   Sampled IDs:       [${d.sampledSafeIdentifiers.join(', ')}]`);
      }
      if (d.findings && d.findings.length > 0) {
        lines.push('   Findings:');
        for (const f of d.findings.slice(0, 10)) {
          const prefix = f.explained ? '  (explained)' : '  *';
          lines.push(`     ${prefix} ${f.message}`);
        }
        if (d.findings.length > 10) {
          lines.push(`     ... and ${d.findings.length - 10} more finding(s).`);
        }
      }
      lines.push('');
    }
  }

  if (verdict === VERDICTS.PASS) {
    lines.push('RESULT: ALL VERIFIED INVARIANTS SATISFIED. ZERO UNEXPLAINED DIFFERENCES.');
  } else {
    lines.push('RESULT: AUDIT FAILED. UNEXPLAINED DIFFERENCES REQUIRE OPERATOR ACTION.');
  }
  lines.push('================================================================================');

  return lines.join('\n');
}

module.exports = {
  formatMachineReadableJson,
  formatHumanSummary,
};
