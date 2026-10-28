'use strict';

// tools/reconciliation/auditors/websiteStoreMappings.js
// P3-REC-001: Auditor for Website-to-Store mappings and cross-service ownership.

const { DOMAINS, DOMAIN_STATUS, DOMAIN_METADATA } = require('../constants');
const { sampleSafeIdentifiers } = require('../safety');

async function auditWebsiteStoreMappings({ coreModels = {}, commerceModels = {}, storeId = null } = {}) {
  const meta = DOMAIN_METADATA[DOMAINS.WEBSITE_STORE_MAPPINGS];
  const { WebsiteData, StoreAccess } = commerceModels;
  const { Website } = coreModels;

  if (!WebsiteData) {
    return {
      id: DOMAINS.WEBSITE_STORE_MAPPINGS,
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
  const websites = await WebsiteData.findAll({ where: whereClause }).catch(() => []);

  if (!websites || websites.length === 0) {
    return {
      id: DOMAINS.WEBSITE_STORE_MAPPINGS,
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

  for (const site of websites) {
    const webId = site.websiteId || site.id;

    if (!site.storeId) {
      defectsCount++;
      findings.push({
        message: `WebsiteData ${webId} has no assigned storeId.`,
        safeId: webId,
        explained: false,
        reason: 'UNASSIGNED_STORE_ID',
      });
      continue;
    }

    // Check StoreAccess match
    if (StoreAccess) {
      const access = await StoreAccess.findOne({ where: { storeId: site.storeId } });
      if (!access) {
        defectsCount++;
        findings.push({
          message: `WebsiteData ${webId} points to non-existent StoreAccess ${site.storeId}.`,
          safeId: webId,
          explained: false,
          reason: 'ORPHAN_WEBSITE_STORE',
        });
      } else if (access.websiteId && access.websiteId !== webId) {
        defectsCount++;
        findings.push({
          message: `WebsiteData ${webId} mismatch: StoreAccess ${site.storeId} has websiteId ${access.websiteId}.`,
          safeId: webId,
          explained: false,
          reason: 'WEBSITE_STORE_ID_CONFLICT',
        });
      }
    }

    // Cross-check with Core Website if available
    if (Website) {
      const coreWebsite = await Website.findByPk(webId).catch(() => null);
      if (coreWebsite && coreWebsite.storeId && coreWebsite.storeId !== site.storeId) {
        defectsCount++;
        findings.push({
          message: `Cross-service storeId mismatch for Website ${webId}: Core="${coreWebsite.storeId}" vs Commerce="${site.storeId}".`,
          safeId: webId,
          explained: false,
          reason: 'CROSS_SERVICE_STORE_MISMATCH',
        });
      }
    }
  }

  let status = DOMAIN_STATUS.PROVEN_ZERO_DIFFERENCES;
  if (defectsCount > 0) {
    status = DOMAIN_STATUS.UNEXPLAINED_DIFFERENCE;
  }

  return {
    id: DOMAINS.WEBSITE_STORE_MAPPINGS,
    name: meta.name,
    status,
    recordsInspected: websites.length,
    defectsCount,
    explainedCount: 0,
    sampledSafeIdentifiers: sampleSafeIdentifiers(findings.map((f) => f.safeId)),
    suggestedOwningPackage: meta.owningPackage,
    operatorGuidance: meta.defaultGuidance,
    findings,
  };
}

module.exports = { auditWebsiteStoreMappings };
