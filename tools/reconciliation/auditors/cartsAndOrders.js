'use strict';

// tools/reconciliation/auditors/cartsAndOrders.js
// P3-REC-001: Auditor for Cart channel and Store isolation (P3-CART-001).

const { DOMAINS, DOMAIN_STATUS, DOMAIN_METADATA } = require('../constants');
const { sampleSafeIdentifiers } = require('../safety');

async function auditCartsAndOrders({ commerceModels = {}, storeId = null } = {}) {
  const meta = DOMAIN_METADATA[DOMAINS.CARTS_AND_ORDERS];
  const { Cart, CartItem, ProductVariant } = commerceModels;

  if (!Cart) {
    return {
      id: DOMAINS.CARTS_AND_ORDERS,
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
  const carts = await Cart.findAll({ where: whereClause }).catch(() => []);

  if (!carts || carts.length === 0) {
    return {
      id: DOMAINS.CARTS_AND_ORDERS,
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

  for (const cart of carts) {
    const isStorefront = cart.channel === 'storefront';
    const isMarketplace = cart.channel === 'marketplace';

    // 1. Channel constraint checks
    if (isStorefront && !cart.websiteId) {
      defectsCount++;
      findings.push({
        message: `Storefront Cart ${cart.id} has no websiteId context.`,
        safeId: cart.id,
        explained: false,
        reason: 'STOREFRONT_CART_MISSING_WEBSITE',
      });
    }

    if (isMarketplace && cart.websiteId) {
      defectsCount++;
      findings.push({
        message: `Marketplace Cart ${cart.id} unexpectedly specifies a websiteId (${cart.websiteId}).`,
        safeId: cart.id,
        explained: false,
        reason: 'MARKETPLACE_CART_HAS_WEBSITE',
      });
    }

    if (CartItem) {
      const items = await CartItem.findAll({ where: { cartId: cart.id } });
      totalItemsInspected += items.length;

      for (const item of items) {
        if (item.quantity <= 0) {
          defectsCount++;
          findings.push({
            message: `CartItem ${item.id} in Cart ${cart.id} has invalid non-positive quantity (${item.quantity}).`,
            safeId: item.id,
            explained: false,
            reason: 'NON_POSITIVE_CART_QUANTITY',
          });
        }

        // Storefront cart items must all belong to cart.storeId
        if (isStorefront && item.storeId && cart.storeId && item.storeId !== cart.storeId) {
          defectsCount++;
          findings.push({
            message: `Storefront Cart ${cart.id} contains item ${item.id} from different Store (${item.storeId} !== ${cart.storeId}).`,
            safeId: cart.id,
            explained: false,
            reason: 'STOREFRONT_CROSS_STORE_ITEM',
          });
        }

        // Cross-check variant store ownership if ProductVariant model exists
        if (ProductVariant && item.skuId) {
          const variant = await ProductVariant.findByPk(item.skuId).catch(() => null);
          if (variant && variant.storeId && item.storeId && variant.storeId !== item.storeId) {
            defectsCount++;
            findings.push({
              message: `CartItem ${item.id} storeId (${item.storeId}) does not match referenced Variant storeId (${variant.storeId}).`,
              safeId: item.id,
              explained: false,
              reason: 'CART_ITEM_VARIANT_STORE_MISMATCH',
            });
          }
        }
      }
    }
  }

  let status = DOMAIN_STATUS.PROVEN_ZERO_DIFFERENCES;
  if (defectsCount > 0) {
    status = DOMAIN_STATUS.UNEXPLAINED_DIFFERENCE;
  }

  return {
    id: DOMAINS.CARTS_AND_ORDERS,
    name: meta.name,
    status,
    recordsInspected: carts.length + totalItemsInspected,
    defectsCount,
    explainedCount: 0,
    sampledSafeIdentifiers: sampleSafeIdentifiers(findings.map((f) => f.safeId)),
    suggestedOwningPackage: meta.owningPackage,
    operatorGuidance: meta.defaultGuidance,
    findings,
  };
}

module.exports = { auditCartsAndOrders };
