'use strict';

// tools/reconciliation/auditors/fulfillmentState.js
// P3-REC-001: Auditor for Order fulfillment, delivery status, and stock deduction synchronization.

const { DOMAINS, DOMAIN_STATUS, DOMAIN_METADATA } = require('../constants');
const { sampleSafeIdentifiers } = require('../safety');

async function auditFulfillmentState({ commerceModels = {}, storeId = null } = {}) {
  const meta = DOMAIN_METADATA[DOMAINS.FULFILLMENT_STATE];
  const { Order } = commerceModels;

  if (!Order) {
    return {
      id: DOMAINS.FULFILLMENT_STATE,
      name: meta.name,
      status: DOMAIN_STATUS.ZERO_DATA_NO_EVIDENCE,
      recordsInspected: 0,
      defectsCount: 0,
      explainedCount: 0,
      sampledSafeIdentifiers: [],
      suggestedOwningPackage: meta.owningPackage,
      operatorGuidance: meta.defaultGuidance,
      findings: [],
    };
  }

  const whereClause = storeId ? { storeId } : {};
  const orders = await Order.findAll({ where: whereClause }).catch(() => []);

  if (!orders || orders.length === 0) {
    return {
      id: DOMAINS.FULFILLMENT_STATE,
      name: meta.name,
      status: DOMAIN_STATUS.ZERO_DATA_NO_EVIDENCE,
      recordsInspected: 0,
      defectsCount: 0,
      explainedCount: 0,
      sampledSafeIdentifiers: [],
      suggestedOwningPackage: meta.owningPackage,
      operatorGuidance: meta.defaultGuidance,
      findings: [],
    };
  }

  const findings = [];
  let defectsCount = 0;

  for (const order of orders) {
    const isCancelled = order.status === 'cancelled';
    const isCompleted = order.status === 'completed';
    const isStockDeducted = Boolean(order.stockDeducted);
    const delStatus = String(order.deliveryStatus || '').toLowerCase();

    // 1. Cancelled orders must not retain active fulfillment or deducted stock
    if (isCancelled) {
      if (isStockDeducted) {
        defectsCount++;
        findings.push({
          message: `Cancelled Order ${order.id} retains stockDeducted=true (stock was not restored).`,
          safeId: order.id,
          explained: false,
          reason: 'CANCELLED_ORDER_STOCK_RETAINED',
        });
      }

      if (delStatus === 'delivered' || delStatus === 'in_transit') {
        defectsCount++;
        findings.push({
          message: `Cancelled Order ${order.id} has active deliveryStatus="${order.deliveryStatus}".`,
          safeId: order.id,
          explained: false,
          reason: 'CANCELLED_ORDER_ACTIVE_DELIVERY',
        });
      }
    }

    // 2. Completed orders must have stock deducted
    if (isCompleted && !isStockDeducted) {
      defectsCount++;
      findings.push({
        message: `Completed Order ${order.id} has stockDeducted=false.`,
        safeId: order.id,
        explained: false,
        reason: 'COMPLETED_ORDER_MISSING_STOCK_DEDUCTION',
      });
    }
  }

  let status = DOMAIN_STATUS.PROVEN_ZERO_DIFFERENCES;
  if (defectsCount > 0) {
    status = DOMAIN_STATUS.UNEXPLAINED_DIFFERENCE;
  }

  return {
    id: DOMAINS.FULFILLMENT_STATE,
    name: meta.name,
    status,
    recordsInspected: orders.length,
    defectsCount,
    explainedCount: 0,
    sampledSafeIdentifiers: sampleSafeIdentifiers(findings.map((f) => f.safeId)),
    suggestedOwningPackage: meta.owningPackage,
    operatorGuidance: meta.defaultGuidance,
    findings,
  };
}

module.exports = { auditFulfillmentState };
