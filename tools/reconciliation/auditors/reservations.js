'use strict';

// tools/reconciliation/auditors/reservations.js
// P3-REC-001: Auditor for active inventory reservations and balance reserved sums.

const { DOMAINS, DOMAIN_STATUS, DOMAIN_METADATA } = require('../constants');
const { sampleSafeIdentifiers } = require('../safety');

const EXPIRATION_GRACE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes grace window for cleanup worker

async function auditReservations({ commerceModels = {}, storeId = null, now = new Date() } = {}) {
  const meta = DOMAIN_METADATA[DOMAINS.RESERVATIONS];
  const { InventoryReservation, InventoryBalance } = commerceModels;

  if (!InventoryReservation) {
    return {
      id: DOMAINS.RESERVATIONS,
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
  const reservations = await InventoryReservation.findAll({ where: whereClause }).catch(() => []);

  if (!reservations || reservations.length === 0) {
    return {
      id: DOMAINS.RESERVATIONS,
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
  let explainedCount = 0;

  const activeReservationsBySku = new Map(); // "storeId:skuId" -> sum
  const currentTimeMs = new Date(now).getTime();

  for (const res of reservations) {
    if (res.quantity <= 0) {
      defectsCount++;
      findings.push({
        message: `Reservation ${res.id} has invalid non-positive quantity (${res.quantity}).`,
        safeId: res.id,
        explained: false,
        reason: 'NON_POSITIVE_RESERVATION_QUANTITY',
      });
    }

    if (res.status === 'active') {
      const key = `${res.storeId}:${res.skuId}`;
      activeReservationsBySku.set(key, (activeReservationsBySku.get(key) || 0) + res.quantity);

      // Check for stale expired reservations
      if (res.expiresAt) {
        const expiresAtMs = new Date(res.expiresAt).getTime();
        if (expiresAtMs < currentTimeMs) {
          const expiredDurationMs = currentTimeMs - expiresAtMs;
          if (expiredDurationMs <= EXPIRATION_GRACE_WINDOW_MS) {
            explainedCount++;
            findings.push({
              message: `Active reservation ${res.id} expired ${Math.round(expiredDurationMs / 1000)}s ago, within worker sweep grace window.`,
              safeId: res.id,
              explained: true,
              reason: 'RESERVATION_EXPIRATION_GRACE_PERIOD',
            });
          } else {
            defectsCount++;
            findings.push({
              message: `Stale active reservation ${res.id} expired ${Math.round(expiredDurationMs / 1000)}s ago without being released.`,
              safeId: res.id,
              explained: false,
              reason: 'STALE_ACTIVE_RESERVATION',
            });
          }
        }
      }
    }
  }

  // Cross-check with InventoryBalance.reserved
  if (InventoryBalance) {
    const balances = await InventoryBalance.findAll({ where: whereClause });
    for (const b of balances) {
      const key = `${b.storeId}:${b.skuId}`;
      const activeSum = activeReservationsBySku.get(key) || 0;
      if (b.reserved !== activeSum) {
        defectsCount++;
        findings.push({
          message: `Reservation sum mismatch: Balance reserved=${b.reserved}, but sum of active reservations=${activeSum} for SKU ${b.skuId}.`,
          safeId: b.skuId,
          explained: false,
          reason: 'RESERVATION_SUM_MISMATCH',
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
    id: DOMAINS.RESERVATIONS,
    name: meta.name,
    status,
    recordsInspected: reservations.length,
    defectsCount,
    explainedCount,
    sampledSafeIdentifiers: sampleSafeIdentifiers(findings.map((f) => f.safeId)),
    suggestedOwningPackage: meta.owningPackage,
    operatorGuidance: meta.defaultGuidance,
    findings,
  };
}

module.exports = { auditReservations };
