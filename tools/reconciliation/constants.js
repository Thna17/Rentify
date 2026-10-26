'use strict';

// tools/reconciliation/constants.js
// P3-REC-001: Constants and status classifications for continuous commerce audits.

const VERDICTS = Object.freeze({
  PASS: 'PASS',
  FAIL: 'FAIL',
});

const DOMAIN_STATUS = Object.freeze({
  PROVEN_ZERO_DIFFERENCES: 'PROVEN_ZERO_DIFFERENCES',
  ZERO_DATA_NO_EVIDENCE: 'ZERO_DATA_NO_EVIDENCE',
  EXPLAINED_DIFFERENCE: 'EXPLAINED_DIFFERENCE',
  UNEXPLAINED_DIFFERENCE: 'UNEXPLAINED_DIFFERENCE',
});

const DOMAINS = Object.freeze({
  CORE_STORE_PROJECTIONS: 'coreStoreProjections',
  COMMERCE_STORE_ACCESS: 'commerceStoreAccess',
  WEBSITE_STORE_MAPPINGS: 'websiteStoreMappings',
  PUBLISHED_CATALOG: 'publishedCatalog',
  PRODUCTS_AND_SKUS: 'productsAndSkus',
  INVENTORY_LEDGER_BALANCES: 'inventoryLedgerBalances',
  COMPATIBILITY_STOCK_FIELDS: 'compatibilityStockFields',
  RESERVATIONS: 'reservations',
  CARTS_AND_ORDERS: 'cartsAndOrders',
  ORDER_SNAPSHOTS_TOTALS: 'orderSnapshotsTotals',
  FULFILLMENT_STATE: 'fulfillmentState',
  COD_COLLECTIONS: 'codCollections',
  REFUNDS: 'refunds',
  PAYMENT_ATTEMPTS_EVENTS: 'paymentAttemptsEvents',
  SUBSCRIPTIONS_ENTITLEMENTS: 'subscriptionsEntitlements',
});

const DOMAIN_METADATA = Object.freeze({
  [DOMAINS.CORE_STORE_PROJECTIONS]: {
    id: DOMAINS.CORE_STORE_PROJECTIONS,
    name: 'Core Store projections',
    owningPackage: 'rentify-server:commerce-sync',
    defaultGuidance: 'Inspect Core EventOutbox for pending or failed store.projected.v1 events and re-trigger sync if needed.',
  },
  [DOMAINS.COMMERCE_STORE_ACCESS]: {
    id: DOMAINS.COMMERCE_STORE_ACCESS,
    name: 'Commerce StoreAccess projections',
    owningPackage: 'ecommerce-server:store-access',
    defaultGuidance: 'Audit StoreAccess table for orphaned tenant access records or missing Core Store associations.',
  },
  [DOMAINS.WEBSITE_STORE_MAPPINGS]: {
    id: DOMAINS.WEBSITE_STORE_MAPPINGS,
    name: 'Website-to-Store mappings',
    owningPackage: 'ecommerce-server:websites',
    defaultGuidance: 'Verify website onboarding records and ensure websiteId uniquely maps to a single valid Store.',
  },
  [DOMAINS.PUBLISHED_CATALOG]: {
    id: DOMAINS.PUBLISHED_CATALOG,
    name: 'Published catalog',
    owningPackage: 'ecommerce-server:catalog',
    defaultGuidance: 'Recalculate catalog visibility using centralized policy to fail closed on unapproved or suspended sellers.',
  },
  [DOMAINS.PRODUCTS_AND_SKUS]: {
    id: DOMAINS.PRODUCTS_AND_SKUS,
    name: 'Products and SKUs',
    owningPackage: 'ecommerce-server:catalog',
    defaultGuidance: 'Run auditProductSkus.js to identify missing default SKUs, duplicate barcodes, or variant store mismatches.',
  },
  [DOMAINS.INVENTORY_LEDGER_BALANCES]: {
    id: DOMAINS.INVENTORY_LEDGER_BALANCES,
    name: 'Inventory ledger and balances',
    owningPackage: 'ecommerce-server:inventory',
    defaultGuidance: 'Reconstruct canonical balance from append-only ledger entries via inventoryLedgerService.recalculateBalance.',
  },
  [DOMAINS.COMPATIBILITY_STOCK_FIELDS]: {
    id: DOMAINS.COMPATIBILITY_STOCK_FIELDS,
    name: 'Compatibility stock fields',
    owningPackage: 'ecommerce-server:inventory',
    defaultGuidance: 'Synchronize legacy Product.stock and ProductVariant.stock compatibility fields with canonical ledger balances.',
  },
  [DOMAINS.RESERVATIONS]: {
    id: DOMAINS.RESERVATIONS,
    name: 'Reservations',
    owningPackage: 'ecommerce-server:inventory',
    defaultGuidance: 'Trigger reservation expiration sweep to release stale locks or reconcile active reservation sums.',
  },
  [DOMAINS.CARTS_AND_ORDERS]: {
    id: DOMAINS.CARTS_AND_ORDERS,
    name: 'Carts and orders',
    owningPackage: 'ecommerce-server:cart',
    defaultGuidance: 'Re-scope cart items and prune orphaned or cross-store references via cartService.revalidateCart.',
  },
  [DOMAINS.ORDER_SNAPSHOTS_TOTALS]: {
    id: DOMAINS.ORDER_SNAPSHOTS_TOTALS,
    name: 'Order snapshots and totals',
    owningPackage: 'ecommerce-server:orders',
    defaultGuidance: 'Inspect checkout pipeline for monetary rounding discrepancies, negative totals, or missing snapshot data.',
  },
  [DOMAINS.FULFILLMENT_STATE]: {
    id: DOMAINS.FULFILLMENT_STATE,
    name: 'Fulfillment state',
    owningPackage: 'ecommerce-server:orders',
    defaultGuidance: 'Verify order cancellation and delivery transitions to ensure stock restoration on cancelled orders.',
  },
  [DOMAINS.COD_COLLECTIONS]: {
    id: DOMAINS.COD_COLLECTIONS,
    name: 'COD collections',
    owningPackage: 'ecommerce-server:payments',
    defaultGuidance: 'Execute auditMarketplaceCod.js to reconcile collected cash amounts with recorded cash collection events.',
  },
  [DOMAINS.REFUNDS]: {
    id: DOMAINS.REFUNDS,
    name: 'Refunds',
    owningPackage: 'ecommerce-server:payments',
    defaultGuidance: 'Reconcile Refund records against payment refundedAmount and verify merchant payout audit trail.',
  },
  [DOMAINS.PAYMENT_ATTEMPTS_EVENTS]: {
    id: DOMAINS.PAYMENT_ATTEMPTS_EVENTS,
    name: 'Payment attempts/provider events',
    owningPackage: 'rentify-server:billing',
    defaultGuidance: 'Run cutluyReconciliationService.reconcilePaymentAttempt to repair discrepancies or ingest missed webhooks.',
  },
  [DOMAINS.SUBSCRIPTIONS_ENTITLEMENTS]: {
    id: DOMAINS.SUBSCRIPTIONS_ENTITLEMENTS,
    name: 'Subscriptions and entitlements',
    owningPackage: 'rentify-server:billing',
    defaultGuidance: 'Invoke entitlementService.reconcileStoreEntitlements to align active subscriptions with capability limits.',
  },
});

module.exports = {
  VERDICTS,
  DOMAIN_STATUS,
  DOMAINS,
  DOMAIN_METADATA,
};
