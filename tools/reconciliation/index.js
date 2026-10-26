'use strict';

// tools/reconciliation/index.js
// P3-REC-001: Main entry point for Continuous Reconciliation Suite.

const {
  VERDICTS,
  DOMAIN_STATUS,
  DOMAINS,
  DOMAIN_METADATA,
} = require('./constants');

const {
  UnsafeReconciliationError,
  validateSafeConnection,
  redactSensitiveData,
  sampleSafeIdentifiers,
  toCents,
} = require('./safety');

const {
  formatMachineReadableJson,
  formatHumanSummary,
} = require('./report');

const { runReconciliationSuite } = require('./suite');

// Export all individual auditors
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

module.exports = {
  // Main runner
  runReconciliationSuite,

  // Constants & Metadata
  VERDICTS,
  DOMAIN_STATUS,
  DOMAINS,
  DOMAIN_METADATA,

  // Safety & Formatters
  UnsafeReconciliationError,
  validateSafeConnection,
  redactSensitiveData,
  sampleSafeIdentifiers,
  toCents,
  formatMachineReadableJson,
  formatHumanSummary,

  // Auditors
  auditors: {
    auditCoreStoreProjections,
    auditCommerceStoreAccess,
    auditWebsiteStoreMappings,
    auditPublishedCatalog,
    auditProductsAndSkus,
    auditInventoryLedgerBalances,
    auditCompatibilityStockFields,
    auditReservations,
    auditCartsAndOrders,
    auditOrderSnapshotsTotals,
    auditFulfillmentState,
    auditCodCollections,
    auditRefunds,
    auditPaymentAttemptsEvents,
    auditSubscriptionsEntitlements,
  },
};
