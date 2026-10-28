'use strict';

// tools/reconciliation/auditors/inventoryLedgerBalances.js
// P3-REC-001: Auditor for Inventory ledger and balance invariants (P3-INV-001, P3-INV-003).

const { DOMAINS, DOMAIN_STATUS, DOMAIN_METADATA } = require('../constants');
const { sampleSafeIdentifiers } = require('../safety');

async function auditInventoryLedgerBalances({ commerceModels = {}, storeId = null } = {}) {
  const meta = DOMAIN_METADATA[DOMAINS.INVENTORY_LEDGER_BALANCES];
  const { InventoryBalance, InventoryLedgerEntry, ProductVariant } = commerceModels;

  if (!InventoryBalance || !InventoryLedgerEntry) {
    return {
      id: DOMAINS.INVENTORY_LEDGER_BALANCES,
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
  const [balances, ledgerEntries] = await Promise.all([
    InventoryBalance.findAll({ where: whereClause }).catch(() => []),
    InventoryLedgerEntry.findAll({ where: whereClause }).catch(() => []),
  ]);

  if (!balances || balances.length === 0) {
    return {
      id: DOMAINS.INVENTORY_LEDGER_BALANCES,
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

  // Aggregate ledger entries by "storeId:skuId"
  const ledgerSums = new Map();
  for (const entry of ledgerEntries) {
    const key = `${entry.storeId}:${entry.skuId}`;
    if (!ledgerSums.has(key)) {
      ledgerSums.set(key, { changeOnHand: 0, changeReserved: 0, count: 0 });
    }
    const agg = ledgerSums.get(key);
    agg.changeOnHand += Number(entry.changeOnHand || 0);
    agg.changeReserved += Number(entry.changeReserved || 0);
    agg.count += 1;
  }

  for (const b of balances) {
    const key = `${b.storeId}:${b.skuId}`;
    const ledger = ledgerSums.get(key) || { changeOnHand: 0, changeReserved: 0, count: 0 };

    // 1. Invariant: onHand >= 0
    if (b.onHand < 0) {
      defectsCount++;
      findings.push({
        message: `Negative onHand balance: SKU ${b.skuId} in Store ${b.storeId} has onHand=${b.onHand}.`,
        safeId: b.skuId,
        explained: false,
        reason: 'NEGATIVE_ON_HAND',
      });
    }

    // 2. Invariant: 0 <= reserved <= onHand
    if (b.reserved < 0 || b.reserved > b.onHand) {
      defectsCount++;
      findings.push({
        message: `Reserved stock invariant violated: SKU ${b.skuId} in Store ${b.storeId} has reserved=${b.reserved}, onHand=${b.onHand}.`,
        safeId: b.skuId,
        explained: false,
        reason: 'RESERVED_EXCEEDS_ON_HAND',
      });
    }

    // 3. Invariant: available === onHand - reserved (available >= 0)
    const expectedAvailable = b.onHand - b.reserved;
    if (b.available !== expectedAvailable || b.available < 0) {
      defectsCount++;
      findings.push({
        message: `Available stock mismatch: SKU ${b.skuId} in Store ${b.storeId} has available=${b.available}, expected=${expectedAvailable}.`,
        safeId: b.skuId,
        explained: false,
        reason: 'AVAILABLE_MISMATCH',
      });
    }

    // 4. Invariant: onHand matches ledger changeOnHand sum
    if (b.onHand !== ledger.changeOnHand) {
      defectsCount++;
      findings.push({
        message: `Ledger sum mismatch for onHand: SKU ${b.skuId} in Store ${b.storeId} has balance=${b.onHand}, ledgerSum=${ledger.changeOnHand}.`,
        safeId: b.skuId,
        explained: false,
        reason: 'LEDGER_SUM_MISMATCH_ON_HAND',
      });
    }

    // 5. Invariant: reserved matches ledger changeReserved sum
    if (b.reserved !== ledger.changeReserved) {
      defectsCount++;
      findings.push({
        message: `Ledger sum mismatch for reserved: SKU ${b.skuId} in Store ${b.storeId} has balance=${b.reserved}, ledgerSum=${ledger.changeReserved}.`,
        safeId: b.skuId,
        explained: false,
        reason: 'LEDGER_SUM_MISMATCH_RESERVED',
      });
    }

    // 6. Store ownership check against ProductVariant
    if (ProductVariant) {
      const variant = await ProductVariant.findByPk(b.skuId).catch(() => null);
      if (variant && variant.storeId && variant.storeId !== b.storeId) {
        defectsCount++;
        findings.push({
          message: `Store mismatch for inventory balance: Balance has storeId ${b.storeId}, but Variant ${b.skuId} has storeId ${variant.storeId}.`,
          safeId: b.skuId,
          explained: false,
          reason: 'BALANCE_STORE_MISMATCH',
        });
      }
    }
  }

  let status = DOMAIN_STATUS.PROVEN_ZERO_DIFFERENCES;
  if (defectsCount > 0) {
    status = DOMAIN_STATUS.UNEXPLAINED_DIFFERENCE;
  }

  return {
    id: DOMAINS.INVENTORY_LEDGER_BALANCES,
    name: meta.name,
    status,
    recordsInspected: balances.length + ledgerEntries.length,
    defectsCount,
    explainedCount: 0,
    sampledSafeIdentifiers: sampleSafeIdentifiers(findings.map((f) => f.safeId)),
    suggestedOwningPackage: meta.owningPackage,
    operatorGuidance: meta.defaultGuidance,
    findings,
  };
}

module.exports = { auditInventoryLedgerBalances };
