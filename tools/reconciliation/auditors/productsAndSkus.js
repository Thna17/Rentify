'use strict';

// tools/reconciliation/auditors/productsAndSkus.js
// P3-REC-001: Auditor for Products and ProductVariants structural invariants (P3-CAT-001).

const { DOMAINS, DOMAIN_STATUS, DOMAIN_METADATA } = require('../constants');
const { sampleSafeIdentifiers } = require('../safety');

async function auditProductsAndSkus({ commerceModels = {}, storeId = null } = {}) {
  const meta = DOMAIN_METADATA[DOMAINS.PRODUCTS_AND_SKUS];
  const { Product, ProductVariant } = commerceModels;

  if (!Product || !ProductVariant) {
    return {
      id: DOMAINS.PRODUCTS_AND_SKUS,
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

  const prodWhere = storeId ? { storeId } : {};
  const varWhere = storeId ? { storeId } : {};

  const [products, variants] = await Promise.all([
    Product.findAll({ where: prodWhere }).catch(() => []),
    ProductVariant.findAll({ where: varWhere }).catch(() => []),
  ]);

  if (!products || (products.length === 0 && variants.length === 0)) {
    return {
      id: DOMAINS.PRODUCTS_AND_SKUS,
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

  // Group variants by productId
  const variantsByProduct = new Map();
  const skusInStore = new Map(); // "storeId:sku" -> count
  const barcodesInStore = new Map(); // "storeId:barcode" -> count

  for (const v of variants) {
    if (!variantsByProduct.has(v.productId)) {
      variantsByProduct.set(v.productId, []);
    }
    variantsByProduct.get(v.productId).push(v);

    if (v.storeId && v.sku) {
      const key = `${v.storeId}:${v.sku}`;
      skusInStore.set(key, (skusInStore.get(key) || 0) + 1);
    }

    if (v.storeId && v.barcode) {
      const key = `${v.storeId}:${v.barcode}`;
      barcodesInStore.set(key, (barcodesInStore.get(key) || 0) + 1);
    }
  }

  // Check product-to-variant rules
  for (const p of products) {
    const pVariants = variantsByProduct.get(p.id) || [];

    if (pVariants.length === 0) {
      defectsCount++;
      findings.push({
        message: `Product ${p.id} ("${p.name}") has zero variants.`,
        safeId: p.id,
        explained: false,
        reason: 'PRODUCT_WITHOUT_VARIANTS',
      });
      continue;
    }

    const isSimple = !p.hasVariants || p.hasVariants === 0;
    if (isSimple) {
      const hasDefault = pVariants.some((v) => v.isDefault === 1 || v.isDefault === true);
      if (!hasDefault) {
        defectsCount++;
        findings.push({
          message: `Simple product ${p.id} ("${p.name}") is missing a default SKU variant.`,
          safeId: p.id,
          explained: false,
          reason: 'SIMPLE_PRODUCT_MISSING_DEFAULT_SKU',
        });
      }
    }

    // Verify variant store ownership matches product store
    for (const v of pVariants) {
      if (v.storeId && p.storeId && v.storeId !== p.storeId) {
        defectsCount++;
        findings.push({
          message: `Store mismatch: Variant ${v.id} has storeId ${v.storeId}, but parent Product ${p.id} has storeId ${p.storeId}.`,
          safeId: v.id,
          explained: false,
          reason: 'VARIANT_STORE_MISMATCH',
        });
      }
    }
  }

  // Check duplicate SKUs in store
  for (const [key, count] of skusInStore.entries()) {
    if (count > 1) {
      defectsCount++;
      const [sId, sku] = key.split(':');
      findings.push({
        message: `Store ${sId} has ${count} variants with duplicate SKU "${sku}".`,
        safeId: sId,
        explained: false,
        reason: 'DUPLICATE_SKU_IN_STORE',
      });
    }
  }

  // Check duplicate barcodes in store
  for (const [key, count] of barcodesInStore.entries()) {
    if (count > 1) {
      defectsCount++;
      const [sId, barcode] = key.split(':');
      findings.push({
        message: `Store ${sId} has ${count} variants with duplicate barcode "${barcode}".`,
        safeId: sId,
        explained: false,
        reason: 'DUPLICATE_BARCODE_IN_STORE',
      });
    }
  }

  let status = DOMAIN_STATUS.PROVEN_ZERO_DIFFERENCES;
  if (defectsCount > 0) {
    status = DOMAIN_STATUS.UNEXPLAINED_DIFFERENCE;
  }

  return {
    id: DOMAINS.PRODUCTS_AND_SKUS,
    name: meta.name,
    status,
    recordsInspected: products.length + variants.length,
    defectsCount,
    explainedCount: 0,
    sampledSafeIdentifiers: sampleSafeIdentifiers(findings.map((f) => f.safeId)),
    suggestedOwningPackage: meta.owningPackage,
    operatorGuidance: meta.defaultGuidance,
    findings,
  };
}

module.exports = { auditProductsAndSkus };
