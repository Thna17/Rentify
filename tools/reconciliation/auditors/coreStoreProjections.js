'use strict';

// tools/reconciliation/auditors/coreStoreProjections.js
// P3-REC-001: Auditor for Core Store projections to Commerce StoreAccess.

const { DOMAINS, DOMAIN_STATUS, DOMAIN_METADATA } = require('../constants');
const { sampleSafeIdentifiers } = require('../safety');

async function auditCoreStoreProjections({ coreModels = {}, commerceModels = {}, storeId = null } = {}) {
  const meta = DOMAIN_METADATA[DOMAINS.CORE_STORE_PROJECTIONS];
  const { Store, EventOutbox } = coreModels;
  const { StoreAccess } = commerceModels;

  if (!Store) {
    return {
      id: DOMAINS.CORE_STORE_PROJECTIONS,
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

  const whereClause = storeId ? { id: storeId } : {};
  const stores = await Store.findAll({ where: whereClause }).catch(() => []);

  if (!stores || stores.length === 0) {
    return {
      id: DOMAINS.CORE_STORE_PROJECTIONS,
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

  for (const store of stores) {
    const access = StoreAccess ? await StoreAccess.findOne({ where: { storeId: store.id } }) : null;

    if (!access) {
      // Check if there is an in-flight outbox event
      const pendingOutbox = EventOutbox
        ? await EventOutbox.findOne({
            where: {
              aggregateType: 'Store',
              aggregateId: store.id,
              eventType: 'store.projected.v1',
            },
          })
        : null;

      if (pendingOutbox && (pendingOutbox.status === 'pending' || pendingOutbox.status === 'retrying')) {
        explainedCount++;
        findings.push({
          message: `Store ${store.id} missing StoreAccess, but store.projected.v1 event is in outbox queue (${pendingOutbox.status}).`,
          safeId: store.id,
          explained: true,
          reason: 'IN_FLIGHT_OUTBOX_EVENT',
        });
      } else {
        defectsCount++;
        findings.push({
          message: `Core Store ${store.id} is missing Commerce StoreAccess projection.`,
          safeId: store.id,
          explained: false,
          reason: 'MISSING_STORE_ACCESS_PROJECTION',
        });
      }
      continue;
    }

    // Verify fields consistency
    if (access.slug && store.slug && access.slug !== store.slug) {
      defectsCount++;
      findings.push({
        message: `Store ${store.id} slug mismatch: Core="${store.slug}" vs Commerce="${access.slug}".`,
        safeId: store.id,
        explained: false,
        reason: 'SLUG_MISMATCH',
      });
    }

    if (access.status && store.status && access.status !== store.status) {
      defectsCount++;
      findings.push({
        message: `Store ${store.id} status mismatch: Core="${store.status}" vs Commerce="${access.status}".`,
        safeId: store.id,
        explained: false,
        reason: 'STATUS_MISMATCH',
      });
    }

    if (store.primaryCategory && access.primaryCategory && access.primaryCategory !== store.primaryCategory) {
      defectsCount++;
      findings.push({
        message: `Store ${store.id} primaryCategory mismatch: Core="${store.primaryCategory}" vs Commerce="${access.primaryCategory}".`,
        safeId: store.id,
        explained: false,
        reason: 'CATEGORY_MISMATCH',
      });
    }
  }

  let status = DOMAIN_STATUS.PROVEN_ZERO_DIFFERENCES;
  if (defectsCount > 0) {
    status = DOMAIN_STATUS.UNEXPLAINED_DIFFERENCE;
  } else if (explainedCount > 0) {
    status = DOMAIN_STATUS.EXPLAINED_DIFFERENCE;
  }

  return {
    id: DOMAINS.CORE_STORE_PROJECTIONS,
    name: meta.name,
    status,
    recordsInspected: stores.length,
    defectsCount,
    explainedCount,
    sampledSafeIdentifiers: sampleSafeIdentifiers(findings.map((f) => f.safeId)),
    suggestedOwningPackage: meta.owningPackage,
    operatorGuidance: meta.defaultGuidance,
    findings,
  };
}

module.exports = { auditCoreStoreProjections };
