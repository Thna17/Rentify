'use strict';

// tools/reconciliation/auditors/publishedCatalog.js
// P3-REC-001: Auditor for Product publication and visibility eligibility (P3-CAT-002).

const { DOMAINS, DOMAIN_STATUS, DOMAIN_METADATA } = require('../constants');
const { sampleSafeIdentifiers } = require('../safety');

async function auditPublishedCatalog({ commerceModels = {}, storeId = null } = {}) {
  const meta = DOMAIN_METADATA[DOMAINS.PUBLISHED_CATALOG];
  const { Product, StoreAccess } = commerceModels;

  if (!Product) {
    return {
      id: DOMAINS.PUBLISHED_CATALOG,
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
  const products = await Product.findAll({ where: whereClause }).catch(() => []);

  if (!products || products.length === 0) {
    return {
      id: DOMAINS.PUBLISHED_CATALOG,
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

  // Pre-fetch store accesses to avoid repeated queries
  const storeMap = new Map();
  if (StoreAccess) {
    const accesses = await StoreAccess.findAll().catch(() => []);
    for (const sa of accesses) {
      storeMap.set(sa.storeId, sa);
    }
  }

  for (const product of products) {
    const prodId = product.id;

    if (!product.storeId) {
      defectsCount++;
      findings.push({
        message: `Product ${prodId} has no storeId (unowned catalog record).`,
        safeId: prodId,
        explained: false,
        reason: 'UNOWNED_PRODUCT',
      });
      continue;
    }

    const store = storeMap.get(product.storeId);
    if (!store) {
      defectsCount++;
      findings.push({
        message: `Product ${prodId} belongs to non-existent StoreAccess ${product.storeId}.`,
        safeId: prodId,
        explained: false,
        reason: 'MISSING_STORE_FOR_PRODUCT',
      });
      continue;
    }

    const isStoreActive = store.status === 'active';
    const isSellerApproved = store.sellerStatus === 'approved';
    const isPublished = product.status === 'published';
    const isDraftOrArchived = product.status === 'draft' || product.status === 'archived';

    // 1. A draft or archived product must never be marketplace-visible
    if (isDraftOrArchived && (product.marketplaceVisible === true || product.marketplaceVisible === 1)) {
      defectsCount++;
      findings.push({
        message: `Product ${prodId} has status "${product.status}" but marketplaceVisible is true.`,
        safeId: prodId,
        explained: false,
        reason: 'UNPUBLISHED_PRODUCT_MARKETPLACE_VISIBLE',
      });
    }

    // 2. Published product checks
    if (isPublished) {
      // Store must be active
      if (!isStoreActive) {
        defectsCount++;
        findings.push({
          message: `Product ${prodId} is published, but Store ${product.storeId} status is "${store.status}".`,
          safeId: prodId,
          explained: false,
          reason: 'STORE_NOT_ACTIVE',
        });
      }

      // Marketplace visibility requires approved seller
      if (product.marketplaceVisible && !isSellerApproved) {
        defectsCount++;
        findings.push({
          message: `Product ${prodId} is marketplace-visible, but Store ${product.storeId} sellerStatus is "${store.sellerStatus}".`,
          safeId: prodId,
          explained: false,
          reason: 'SELLER_NOT_APPROVED_FOR_MARKETPLACE',
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
    id: DOMAINS.PUBLISHED_CATALOG,
    name: meta.name,
    status,
    recordsInspected: products.length,
    defectsCount,
    explainedCount,
    sampledSafeIdentifiers: sampleSafeIdentifiers(findings.map((f) => f.safeId)),
    suggestedOwningPackage: meta.owningPackage,
    operatorGuidance: meta.defaultGuidance,
    findings,
  };
}

module.exports = { auditPublishedCatalog };
