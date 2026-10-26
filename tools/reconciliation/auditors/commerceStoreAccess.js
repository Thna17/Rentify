'use strict';

// tools/reconciliation/auditors/commerceStoreAccess.js
// P3-REC-001: Auditor for Commerce StoreAccess rows and reverse Core Store integrity.

const { DOMAINS, DOMAIN_STATUS, DOMAIN_METADATA } = require('../constants');
const { sampleSafeIdentifiers } = require('../safety');

async function auditCommerceStoreAccess({ coreModels = {}, commerceModels = {}, storeId = null } = {}) {
  const meta = DOMAIN_METADATA[DOMAINS.COMMERCE_STORE_ACCESS];
  const { StoreAccess } = commerceModels;
  const { Store } = coreModels;

  if (!StoreAccess) {
    return {
      id: DOMAINS.COMMERCE_STORE_ACCESS,
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
  const rows = await StoreAccess.findAll({ where: whereClause }).catch(() => []);

  if (!rows || rows.length === 0) {
    return {
      id: DOMAINS.COMMERCE_STORE_ACCESS,
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
  const seenStoreIds = new Set();
  const seenWebsiteIds = new Map();

  for (const row of rows) {
    if (!row.storeId) {
      defectsCount++;
      findings.push({
        message: 'StoreAccess row missing storeId.',
        safeId: row.id,
        explained: false,
        reason: 'MISSING_STORE_ID',
      });
      continue;
    }

    // Check duplicate storeId in StoreAccess
    if (seenStoreIds.has(row.storeId)) {
      defectsCount++;
      findings.push({
        message: `Duplicate StoreAccess row for storeId ${row.storeId}.`,
        safeId: row.storeId,
        explained: false,
        reason: 'DUPLICATE_STORE_ACCESS',
      });
    }
    seenStoreIds.add(row.storeId);

    // Check website uniqueness across stores
    if (row.websiteId) {
      if (seenWebsiteIds.has(row.websiteId) && seenWebsiteIds.get(row.websiteId) !== row.storeId) {
        defectsCount++;
        findings.push({
          message: `Website ${row.websiteId} is mapped to multiple Stores (${seenWebsiteIds.get(row.websiteId)} and ${row.storeId}).`,
          safeId: row.websiteId,
          explained: false,
          reason: 'AMBIGUOUS_WEBSITE_STORE_MAPPING',
        });
      } else {
        seenWebsiteIds.set(row.websiteId, row.storeId);
      }
    }

    // Reverse check in Core Store table
    if (Store) {
      const coreStore = await Store.findByPk(row.storeId).catch(() => null);
      if (!coreStore) {
        defectsCount++;
        findings.push({
          message: `Orphan StoreAccess row: storeId ${row.storeId} does not exist in Core.`,
          safeId: row.storeId,
          explained: false,
          reason: 'ORPHAN_STORE_ACCESS',
        });
      }
    }
  }

  let status = DOMAIN_STATUS.PROVEN_ZERO_DIFFERENCES;
  if (defectsCount > 0) {
    status = DOMAIN_STATUS.UNEXPLAINED_DIFFERENCE;
  }

  return {
    id: DOMAINS.COMMERCE_STORE_ACCESS,
    name: meta.name,
    status,
    recordsInspected: rows.length,
    defectsCount,
    explainedCount: 0,
    sampledSafeIdentifiers: sampleSafeIdentifiers(findings.map((f) => f.safeId)),
    suggestedOwningPackage: meta.owningPackage,
    operatorGuidance: meta.defaultGuidance,
    findings,
  };
}

module.exports = { auditCommerceStoreAccess };
