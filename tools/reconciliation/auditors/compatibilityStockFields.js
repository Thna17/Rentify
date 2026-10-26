'use strict';

// tools/reconciliation/auditors/compatibilityStockFields.js
// P3-REC-001: Auditor for compatibility stock fields (Product.stock, ProductVariant.stock) vs canonical balances.

const { DOMAINS, DOMAIN_STATUS, DOMAIN_METADATA } = require('../constants');
const { sampleSafeIdentifiers } = require('../safety');

async function auditCompatibilityStockFields({ commerceModels = {}, storeId = null, now = new Date() } = {}) {
  const meta = DOMAIN_METADATA[DOMAINS.COMPATIBILITY_STOCK_FIELDS];
  const { ProductVariant, InventoryBalance, InventoryLedgerEntry } = commerceModels;

  if (!ProductVariant || !InventoryBalance) {
    return {
      id: DOMAINS.COMPATIBILITY_STOCK_FIELDS,
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
  const [variants, balances] = await Promise.all([
    ProductVariant.findAll({ where: whereClause }).catch(() => []),
    InventoryBalance.findAll({ where: whereClause }).catch(() => []),
  ]);

  if (!variants || variants.length === 0) {
    return {
      id: DOMAINS.COMPATIBILITY_STOCK_FIELDS,
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

  const balanceMap = new Map();
  for (const b of balances) {
    balanceMap.set(b.skuId, b);
  }

  const findings = [];
  let defectsCount = 0;
  let explainedCount = 0;

  for (const v of variants) {
    const balance = balanceMap.get(v.id);
    if (!balance) continue; // Unmanaged stock or no ledger balance created yet

    const compatStock = Number(v.stock !== null && v.stock !== undefined ? v.stock : balance.available);
    // Compatibility stock projection tracks available stock or onHand
    const matchesAvailable = compatStock === balance.available;
    const matchesOnHand = compatStock === balance.onHand;

    if (!matchesAvailable && !matchesOnHand) {
      // Check if recent ledger mutation occurred within last 5 seconds (in-flight projection update)
      let isRecent = false;
      if (InventoryLedgerEntry) {
        const recentEntry = await InventoryLedgerEntry.findOne({
          where: { skuId: v.id },
          order: [['createdAt', 'DESC']],
        });
        if (recentEntry && recentEntry.createdAt) {
          const ageMs = Math.abs(new Date(now).getTime() - new Date(recentEntry.createdAt).getTime());
          if (ageMs <= 5000) {
            isRecent = true;
          }
        }
      }

      if (isRecent) {
        explainedCount++;
        findings.push({
          message: `Variant ${v.id} compatibility stock (${v.stock}) differs from canonical balance (avail=${balance.available}, onHand=${balance.onHand}), but ledger entry occurred within in-flight window.`,
          safeId: v.id,
          explained: true,
          reason: 'IN_FLIGHT_STOCK_PROJECTION',
        });
      } else {
        defectsCount++;
        findings.push({
          message: `Compatibility stock divergence: Variant ${v.id} stock=${v.stock}, but canonical balance has available=${balance.available}, onHand=${balance.onHand}.`,
          safeId: v.id,
          explained: false,
          reason: 'COMPATIBILITY_STOCK_DIVERGENCE',
        });
      }
    }
  }

  let status = DOMAIN_STATUS.PROVEN_ZERO_DIFFERENCES;
  if (defectsCount > 0) {
    status = DOMAIN_STATUS.UNEXPLAINED_DIFFERENCE;
  } else if (explainedCount > 0) {
    status = DOMAIN_STATUS.EXPLAINED_DIFFERENCE;
  }

  return {
    id: DOMAINS.COMPATIBILITY_STOCK_FIELDS,
    name: meta.name,
    status,
    recordsInspected: variants.length,
    defectsCount,
    explainedCount,
    sampledSafeIdentifiers: sampleSafeIdentifiers(findings.map((f) => f.safeId)),
    suggestedOwningPackage: meta.owningPackage,
    operatorGuidance: meta.defaultGuidance,
    findings,
  };
}

module.exports = { auditCompatibilityStockFields };
