'use strict';

// tools/reconciliation/suite.js
// P3-REC-001: Central continuous commerce reconciliation runner orchestrating 15 domain audits.

const crypto = require('crypto');
const { VERDICTS, DOMAIN_STATUS } = require('./constants');
const { validateSafeConnection } = require('./safety');
const { formatMachineReadableJson, formatHumanSummary } = require('./report');

// Auditors
const { auditCoreStoreProjections } = require('./auditors/coreStoreProjections');
const { auditCommerceStoreAccess } = require('./auditors/commerceStoreAccess');
const { auditWebsiteStoreMappings } = require('./auditors/websiteStoreMappings');
const { auditPublishedCatalog } = require('./auditors/publishedCatalog');
const { auditProductsAndSkus } = require('./auditors/productsAndSkus');
const { auditInventoryLedgerBalances } = require('./auditors/inventoryLedgerBalances');
const { auditCompatibilityStockFields } = require('./auditors/compatibilityStockFields');
const { auditReservations } = require('./auditors/reservations');
const { auditCartsAndOrders } = require('./auditors/cartsAndOrders');
const { auditOrderSnapshotsTotals } = require('./auditors/orderSnapshotsTotals');
const { auditFulfillmentState } = require('./auditors/fulfillmentState');
const { auditCodCollections } = require('./auditors/codCollections');
const { auditRefunds } = require('./auditors/refunds');
const { auditPaymentAttemptsEvents } = require('./auditors/paymentAttemptsEvents');
const { auditSubscriptionsEntitlements } = require('./auditors/subscriptionsEntitlements');

/**
 * Runs the continuous reconciliation audit suite across all 15 commerce domains.
 *
 * @param {object} [params]
 * @param {string} [params.storeId] - Optional Store ID for store-scoped audit
 * @param {object} [params.coreModels] - Sequelize models for Core API
 * @param {object} [params.commerceModels] - Sequelize models for Commerce API
 * @param {object} [params.options] - Safety and configuration options
 * @param {Date} [params.now] - Current timestamp reference
 * @returns {Promise<object>} Complete audit result with JSON and human summary
 */
async function runReconciliationSuite({
  storeId = null,
  coreModels = null,
  commerceModels = null,
  options = {},
  now = new Date(),
} = {}) {
  // 1. Verify safe connection requirements
  validateSafeConnection(options);

  // 2. Resolve default models if omitted
  let resolvedCoreModels = coreModels;
  if (!resolvedCoreModels) {
    try {
      resolvedCoreModels = require('../../rentify-server/src/models');
    } catch (_) {
      resolvedCoreModels = {};
    }
  }

  let resolvedCommerceModels = commerceModels;
  if (!resolvedCommerceModels) {
    try {
      resolvedCommerceModels = require('../../ecommerce-server/models');
    } catch (_) {
      resolvedCommerceModels = {};
    }
  }

  // 3. Initialize run metadata
  const runId = `rec-run-${crypto.randomUUID()}`;
  const timestamp = new Date(now).toISOString();
  const scope = {
    type: storeId ? 'store' : 'platform',
    storeId: storeId || null,
  };

  const auditorParams = {
    coreModels: resolvedCoreModels,
    commerceModels: resolvedCommerceModels,
    storeId,
    now,
  };

  // 4. Run all 15 read-only audits in deterministic order
  const domainResults = [
    await auditCoreStoreProjections(auditorParams),
    await auditCommerceStoreAccess(auditorParams),
    await auditWebsiteStoreMappings(auditorParams),
    await auditPublishedCatalog(auditorParams),
    await auditProductsAndSkus(auditorParams),
    await auditInventoryLedgerBalances(auditorParams),
    await auditCompatibilityStockFields(auditorParams),
    await auditReservations(auditorParams),
    await auditCartsAndOrders(auditorParams),
    await auditOrderSnapshotsTotals(auditorParams),
    await auditFulfillmentState(auditorParams),
    await auditCodCollections(auditorParams),
    await auditRefunds(auditorParams),
    await auditPaymentAttemptsEvents(auditorParams),
    await auditSubscriptionsEntitlements(auditorParams),
  ];

  // 5. Aggregate summary counts
  let provenZeroDifferencesCount = 0;
  let zeroDataCount = 0;
  let explainedDifferencesCount = 0;
  let unexplainedDifferencesCount = 0;
  let totalRecordsInspected = 0;
  let totalDefectsCount = 0;

  for (const dom of domainResults) {
    totalRecordsInspected += dom.recordsInspected || 0;
    totalDefectsCount += dom.defectsCount || 0;

    switch (dom.status) {
      case DOMAIN_STATUS.PROVEN_ZERO_DIFFERENCES:
        provenZeroDifferencesCount++;
        break;
      case DOMAIN_STATUS.ZERO_DATA_NO_EVIDENCE:
        zeroDataCount++;
        break;
      case DOMAIN_STATUS.EXPLAINED_DIFFERENCE:
        explainedDifferencesCount++;
        break;
      case DOMAIN_STATUS.UNEXPLAINED_DIFFERENCE:
        unexplainedDifferencesCount++;
        break;
      default:
        unexplainedDifferencesCount++;
    }
  }

  // 6. Compute overall verdict
  const verdict = unexplainedDifferencesCount === 0 ? VERDICTS.PASS : VERDICTS.FAIL;

  const result = {
    runId,
    timestamp,
    scope,
    verdict,
    summary: {
      totalDomainsAudited: domainResults.length,
      provenZeroDifferencesCount,
      zeroDataCount,
      explainedDifferencesCount,
      unexplainedDifferencesCount,
      totalRecordsInspected,
      totalDefectsCount,
    },
    domains: domainResults,
  };

  // 7. Format outputs
  result.json = formatMachineReadableJson(result);
  result.humanSummary = formatHumanSummary(result);

  return result;
}

module.exports = {
  runReconciliationSuite,
};
