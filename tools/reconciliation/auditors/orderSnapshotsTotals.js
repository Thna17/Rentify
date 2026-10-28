'use strict';

// tools/reconciliation/auditors/orderSnapshotsTotals.js
// P3-REC-001: Auditor for Order mathematical integrity, currency policy, and snapshot coverage.

const { DOMAINS, DOMAIN_STATUS, DOMAIN_METADATA } = require('../constants');
const { sampleSafeIdentifiers, toCents } = require('../safety');

async function auditOrderSnapshotsTotals({ commerceModels = {}, storeId = null } = {}) {
  const meta = DOMAIN_METADATA[DOMAINS.ORDER_SNAPSHOTS_TOTALS];
  const { Order, OrderItem } = commerceModels;

  if (!Order) {
    return {
      id: DOMAINS.ORDER_SNAPSHOTS_TOTALS,
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
      id: DOMAINS.ORDER_SNAPSHOTS_TOTALS,
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
  let totalItemsInspected = 0;

  for (const order of orders) {
    const currency = String(order.currency || 'USD').toUpperCase();

    // 1. Currency invariant (USD only for Release 1)
    if (currency !== 'USD') {
      defectsCount++;
      findings.push({
        message: `Order ${order.id} has invalid non-USD currency "${currency}".`,
        safeId: order.id,
        explained: false,
        reason: 'INVALID_CURRENCY',
      });
    }

    const subtotalCents = toCents(order.subtotal);
    const feeCents = toCents(order.shippingFee);
    const taxCents = toCents(order.taxTotal);
    const discountCents = toCents(order.discountTotal);
    const totalCents = toCents(order.totalAmount);

    // 2. Non-negative constraints
    if (subtotalCents < 0 || feeCents < 0 || totalCents < 0) {
      defectsCount++;
      findings.push({
        message: `Order ${order.id} has negative amount components (subtotal=${order.subtotal}, fee=${order.shippingFee}, total=${order.totalAmount}).`,
        safeId: order.id,
        explained: false,
        reason: 'NEGATIVE_ORDER_AMOUNTS',
      });
    }

    // 3. Formula integrity: subtotal + fee + tax - discount === totalAmount
    const expectedTotal = subtotalCents + feeCents + taxCents - discountCents;
    if (expectedTotal !== totalCents) {
      defectsCount++;
      findings.push({
        message: `Order ${order.id} total formula mismatch: expected ${expectedTotal} cents, got ${totalCents} cents.`,
        safeId: order.id,
        explained: false,
        reason: 'ORDER_TOTAL_MISMATCH',
      });
    }

    // 4. Order snapshot coverage
    if (!order.orderSnapshot) {
      defectsCount++;
      findings.push({
        message: `Order ${order.id} is missing orderSnapshot data.`,
        safeId: order.id,
        explained: false,
        reason: 'MISSING_ORDER_SNAPSHOT',
      });
    }

    // 5. Line items checks
    if (OrderItem) {
      const items = await OrderItem.findAll({ where: { orderId: order.id } });
      totalItemsInspected += items.length;

      let lineItemsSumCents = 0;
      for (const item of items) {
        lineItemsSumCents += toCents(item.total);

        if (!item.lineSnapshot) {
          defectsCount++;
          findings.push({
            message: `OrderItem ${item.id} in Order ${order.id} is missing lineSnapshot.`,
            safeId: item.id,
            explained: false,
            reason: 'MISSING_LINE_SNAPSHOT',
          });
        }

        if (item.storeId && order.storeId && item.storeId !== order.storeId) {
          defectsCount++;
          findings.push({
            message: `OrderItem ${item.id} has storeId ${item.storeId}, differing from Order storeId ${order.storeId}.`,
            safeId: item.id,
            explained: false,
            reason: 'ORDER_ITEM_STORE_MISMATCH',
          });
        }
      }

      if (items.length > 0 && lineItemsSumCents !== subtotalCents) {
        defectsCount++;
        findings.push({
          message: `Order ${order.id} line items sum (${lineItemsSumCents} cents) does not match subtotal (${subtotalCents} cents).`,
          safeId: order.id,
          explained: false,
          reason: 'LINE_ITEMS_SUM_MISMATCH',
        });
      }
    }
  }

  let status = DOMAIN_STATUS.PROVEN_ZERO_DIFFERENCES;
  if (defectsCount > 0) {
    status = DOMAIN_STATUS.UNEXPLAINED_DIFFERENCE;
  }

  return {
    id: DOMAINS.ORDER_SNAPSHOTS_TOTALS,
    name: meta.name,
    status,
    recordsInspected: orders.length + totalItemsInspected,
    defectsCount,
    explainedCount: 0,
    sampledSafeIdentifiers: sampleSafeIdentifiers(findings.map((f) => f.safeId)),
    suggestedOwningPackage: meta.owningPackage,
    operatorGuidance: meta.defaultGuidance,
    findings,
  };
}

module.exports = { auditOrderSnapshotsTotals };
