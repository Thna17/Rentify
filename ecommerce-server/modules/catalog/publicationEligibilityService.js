// ecommerce-server/modules/catalog/publicationEligibilityService.js
// P3-CAT-002: Centralized Channel Publication and Visibility Policy.
// Evaluates: Store status, Seller approval, Entitlement, Primary Store category,
// Product category, Product status, SKU status, Moderation status, Marketplace visibility,
// Storefront visibility, Website status, Stock/availability, Delivery readiness, Channel,
// and Custom-domain browse-only boundary.
//
// Guarantees:
// 1. Public reads fail closed.
// 2. One policy reused across marketplace, storefront, and POS.
// 3. Public APIs never expose private moderation or KYC details.
// 4. Merchant/admin responses explain blocked publication safely with nextAction.
// 5. Zero duplicated eligibility logic in frontends.
// 6. Historical orders are immutable and untouched by publication state changes.

const { Op } = require('sequelize');
const { canonicalCategory } = require('../../config/marketplaceTaxonomy');
const isMarketplaceCategory = (val) => Boolean(canonicalCategory(val));

const REASON_CODES = {
  // 1. Store status
  STORE_NOT_FOUND: {
    code: 'STORE_NOT_FOUND',
    message: 'Store profile does not exist.',
    nextAction: 'Create and configure your store before publishing products.',
    blocking: true,
  },
  STORE_SUSPENDED: {
    code: 'STORE_SUSPENDED',
    message: 'Store has been suspended by platform administration.',
    nextAction: 'Contact platform operations to resolve account standing.',
    blocking: true,
  },
  STORE_CLOSED: {
    code: 'STORE_CLOSED',
    message: 'Store is currently closed.',
    nextAction: 'Re-open your store in store settings.',
    blocking: true,
  },
  STORE_INACTIVE: {
    code: 'STORE_INACTIVE',
    message: 'Store is not active.',
    nextAction: 'Activate your store to enable selling.',
    blocking: true,
  },

  // 2. Seller approval (marketplace only)
  SELLER_APPROVAL_PENDING: {
    code: 'SELLER_APPROVAL_PENDING',
    message: 'Marketplace seller approval is pending platform review.',
    nextAction: 'Complete seller verification checklist and await platform approval.',
    blocking: true,
  },
  SELLER_APPROVAL_NEEDS_CHANGES: {
    code: 'SELLER_APPROVAL_NEEDS_CHANGES',
    message: 'Marketplace application requires requested changes.',
    nextAction: 'Review operator feedback in your dashboard and resubmit required information.',
    blocking: true,
  },
  SELLER_APPROVAL_REJECTED: {
    code: 'SELLER_APPROVAL_REJECTED',
    message: 'Marketplace seller application was rejected.',
    nextAction: 'Contact platform support for details regarding your application.',
    blocking: true,
  },
  SELLER_APPROVAL_SUSPENDED: {
    code: 'SELLER_APPROVAL_SUSPENDED',
    message: 'Marketplace selling privileges have been suspended.',
    nextAction: 'Contact trust & safety to resolve marketplace account status.',
    blocking: true,
  },

  // 3. Entitlement
  MARKETPLACE_NOT_ENTITLED: {
    code: 'MARKETPLACE_NOT_ENTITLED',
    message: 'Store is not enrolled in the marketplace pilot.',
    nextAction: 'Enroll in the marketplace pilot to enable marketplace selling.',
    blocking: true,
  },
  STOREFRONT_NOT_ENTITLED: {
    code: 'STOREFRONT_NOT_ENTITLED',
    message: 'Storefront subscription or trial is inactive.',
    nextAction: 'Renew your storefront subscription or activate your plan.',
    blocking: true,
  },

  // 4. Primary Store category
  STORE_PRIMARY_CATEGORY_MISSING: {
    code: 'STORE_PRIMARY_CATEGORY_MISSING',
    message: 'Primary store category has not been selected.',
    nextAction: 'Select a primary store category in store profile settings.',
    blocking: true,
  },
  STORE_CATEGORY_REVIEW_REQUIRED: {
    code: 'STORE_CATEGORY_REVIEW_REQUIRED',
    message: 'Store category update is awaiting platform verification.',
    nextAction: 'Wait for platform operator to verify store category update.',
    blocking: true,
  },

  // 5. Product category
  PRODUCT_MARKETPLACE_CATEGORY_MISSING: {
    code: 'PRODUCT_MARKETPLACE_CATEGORY_MISSING',
    message: 'Product does not have a marketplace category assigned.',
    nextAction: 'Assign a marketplace category to this product.',
    blocking: true,
  },
  INVALID_MARKETPLACE_CATEGORY: {
    code: 'INVALID_MARKETPLACE_CATEGORY',
    message: 'Product marketplace category does not match platform taxonomy.',
    nextAction: 'Select a valid category from the standard marketplace category taxonomy.',
    blocking: true,
  },

  // 6. Product status
  PRODUCT_DRAFT: {
    code: 'PRODUCT_DRAFT',
    message: 'Product is currently saved as a draft.',
    nextAction: 'Publish the product to make it available for sale.',
    blocking: true,
  },
  PRODUCT_ARCHIVED: {
    code: 'PRODUCT_ARCHIVED',
    message: 'Product has been archived.',
    nextAction: 'Unarchive or restore the product to resume selling.',
    blocking: true,
  },
  PRODUCT_INACTIVE: {
    code: 'PRODUCT_INACTIVE',
    message: 'Product is set to inactive.',
    nextAction: 'Change product status to active in catalog.',
    blocking: true,
  },
  PRODUCT_OUT_OF_STOCK: {
    code: 'PRODUCT_OUT_OF_STOCK',
    message: 'Product is marked out of stock.',
    nextAction: 'Replenish inventory stock to restore product availability.',
    blocking: false, // Visible in catalog with badge, but purchase blocked
  },

  // 7. SKU status
  SKU_DISABLED: {
    code: 'SKU_DISABLED',
    message: 'Selected variant or SKU is disabled.',
    nextAction: 'Enable the variant in product options.',
    blocking: true,
  },
  NO_ACTIVE_SKU: {
    code: 'NO_ACTIVE_SKU',
    message: 'Product has no active variants or SKUs.',
    nextAction: 'Enable at least one variant SKU for this product.',
    blocking: true,
  },

  // 8. Moderation status
  PRODUCT_MODERATION_PENDING: {
    code: 'PRODUCT_MODERATION_PENDING',
    message: 'Product is undergoing platform moderation review.',
    nextAction: 'Wait for platform content moderation review to complete.',
    blocking: true,
  },
  PRODUCT_MODERATION_FLAGGED: {
    code: 'PRODUCT_MODERATION_FLAGGED',
    message: 'Product listing was flagged for trust and safety review.',
    nextAction: 'Review product details against acceptable listing policies and resolve flags.',
    blocking: true,
  },
  PRODUCT_MODERATION_REJECTED: {
    code: 'PRODUCT_MODERATION_REJECTED',
    message: 'Product listing does not meet platform content standards.',
    nextAction: 'Modify prohibited attributes or contact platform support to appeal.',
    blocking: true,
  },
  PRODUCT_MODERATION_HELD: {
    code: 'PRODUCT_MODERATION_HELD',
    message: 'Product listing is temporarily held pending trust and safety evaluation.',
    nextAction: 'Inspect product policy guidance and resolve flagged attributes.',
    blocking: true,
  },

  // 8a. Prohibited goods categories (P5-TRUST-001 / DEC-006)
  PROHIBITED_WEAPONS_EXPLOSIVES: {
    code: 'PROHIBITED_WEAPONS_EXPLOSIVES',
    message: 'Listing of weapons, firearms, or explosives is strictly prohibited by platform policy.',
    nextAction: 'Remove weapons, firearms, ammunition, or combat equipment from listing.',
    blocking: true,
  },
  PROHIBITED_NARCOTICS: {
    code: 'PROHIBITED_NARCOTICS',
    message: 'Listing of illegal narcotics, drugs, or paraphernalia is strictly prohibited.',
    nextAction: 'Remove controlled substances and prohibited drug-related terms.',
    blocking: true,
  },
  PROHIBITED_COUNTERFEIT: {
    code: 'PROHIBITED_COUNTERFEIT',
    message: 'Listing of counterfeit or trademark-infringing goods is prohibited.',
    nextAction: 'Submit manufacturer authorization or licensing documentation via appeal.',
    blocking: true,
  },
  PROHIBITED_WILDLIFE_FLORA: {
    code: 'PROHIBITED_WILDLIFE_FLORA',
    message: 'Listing of protected wildlife, ivory, or endangered species parts is prohibited.',
    nextAction: 'Remove protected flora/fauna items in compliance with biodiversity laws.',
    blocking: true,
  },
  PROHIBITED_HUMAN_REMAINS: {
    code: 'PROHIBITED_HUMAN_REMAINS',
    message: 'Commercial trade in human remains or organs is strictly prohibited.',
    nextAction: 'Remove prohibited biological or anatomical items immediately.',
    blocking: true,
  },
  PROHIBITED_ADULT_CONTENT: {
    code: 'PROHIBITED_ADULT_CONTENT',
    message: 'Sexually explicit adult content and adult services are prohibited on the platform.',
    nextAction: 'Remove adult-oriented or sexually explicit materials.',
    blocking: true,
  },
  PROHIBITED_HAZARDOUS_MATERIALS: {
    code: 'PROHIBITED_HAZARDOUS_MATERIALS',
    message: 'Sale of toxic chemicals and hazardous materials is restricted.',
    nextAction: 'Submit government safety clearances or remove hazardous materials.',
    blocking: true,
  },
  PROHIBITED_UNLICENSED_MEDICINE: {
    code: 'PROHIBITED_UNLICENSED_MEDICINE',
    message: 'Prescription pharmaceuticals require verified health licensing.',
    nextAction: 'Provide Ministry of Health pharmaceutical license via appeal.',
    blocking: true,
  },

  // 9. Marketplace visibility
  MARKETPLACE_VISIBILITY_DISABLED: {
    code: 'MARKETPLACE_VISIBILITY_DISABLED',
    message: 'Product is hidden from the marketplace by merchant override.',
    nextAction: 'Change product visibility to inherit store default or enable marketplace listing.',
    blocking: true,
  },
  STORE_MARKETPLACE_DISABLED: {
    code: 'STORE_MARKETPLACE_DISABLED',
    message: 'Marketplace listing is turned off for this store.',
    nextAction: 'Turn on marketplace selling in store settings.',
    blocking: true,
  },

  // 10. Storefront visibility
  STOREFRONT_NOT_LINKED: {
    code: 'STOREFRONT_NOT_LINKED',
    message: 'Product is not linked to a storefront website.',
    nextAction: 'Link the store to a website template to sell on a custom storefront.',
    blocking: true,
  },
  STOREFRONT_TENANT_MISMATCH: {
    code: 'STOREFRONT_TENANT_MISMATCH',
    message: 'Product website does not match the store website.',
    nextAction: 'Correct the website association in product details.',
    blocking: true,
  },

  // 11. Website status
  WEBSITE_NOT_FOUND: {
    code: 'WEBSITE_NOT_FOUND',
    message: 'Storefront website record not found.',
    nextAction: 'Create or link a website in store onboarding.',
    blocking: true,
  },
  WEBSITE_INACTIVE: {
    code: 'WEBSITE_INACTIVE',
    message: 'Storefront website is currently inactive.',
    nextAction: 'Publish and activate the website in deployment settings.',
    blocking: true,
  },
  WEBSITE_SUSPENDED: {
    code: 'WEBSITE_SUSPENDED',
    message: 'Storefront website has been suspended.',
    nextAction: 'Contact platform operations regarding website standing.',
    blocking: true,
  },
  WEBSITE_MAINTENANCE: {
    code: 'WEBSITE_MAINTENANCE',
    message: 'Storefront website is currently in maintenance mode.',
    nextAction: 'Disable maintenance mode in website settings to resume public browsing.',
    blocking: true,
  },

  // 12. Stock / availability
  OUT_OF_STOCK: {
    code: 'OUT_OF_STOCK',
    message: 'Product is currently out of stock.',
    nextAction: 'Replenish inventory balance in store stock manager.',
    blocking: false, // Browsable with badge, purchase blocked
  },

  // 13. Delivery readiness
  DELIVERY_POLICY_MISSING: {
    code: 'DELIVERY_POLICY_MISSING',
    message: 'Store delivery policy has not been configured.',
    nextAction: 'Configure your flat delivery fee in store delivery settings.',
    blocking: true,
  },

  // 14. Custom domain boundary
  CUSTOM_DOMAIN_BROWSE_ONLY: {
    code: 'CUSTOM_DOMAIN_BROWSE_ONLY',
    message: 'Checkout and purchasing are disabled on custom domains in Release 1.',
    nextAction: 'Direct customers to your verified hosted subdomain to complete checkout.',
    blocking: false, // Browsable on custom domain, purchase blocked
  },
};

/**
 * Pure evaluation function for a single channel.
 *
 * @param {Object} context
 * @param {Object} context.product - Product model or plain object
 * @param {Object} [context.variant] - Specific ProductVariant model or plain object
 * @param {Array} [context.variants] - Array of all ProductVariants
 * @param {Object} [context.store] - StoreAccess model or plain object
 * @param {Object} [context.website] - WebsiteData model or plain object
 * @param {Object} [context.deliveryPolicy] - StoreDeliveryPolicy model or plain object
 * @param {Object} [context.inventoryBalance] - InventoryBalance ({ onHand, reserved, available })
 * @param {'marketplace' | 'storefront' | 'pos'} [context.channel='marketplace'] - Sales channel
 * @param {Object} [context.hostContext] - { isCustomDomain: boolean, isHostedStorefront: boolean }
 * @param {boolean} [context.isPrivileged=false] - True for merchant/admin callers; false for public buyers
 * @returns {Object} { eligible: boolean, purchasable: boolean, reasons: Array<{ code, message, nextAction, blocking }> }
 */
function evaluateChannel(context) {
  const {
    product,
    variant = null,
    variants = [],
    store = null,
    website = null,
    deliveryPolicy = null,
    inventoryBalance = null,
    channel = 'marketplace',
    hostContext = {},
    isPrivileged = false,
  } = context;

  const reasons = [];

  // Helper to append reason safely
  const addReason = (reasonKey) => {
    const r = REASON_CODES[reasonKey];
    if (r && !reasons.some((existing) => existing.code === r.code)) {
      reasons.push({ ...r });
    }
  };

  if (!product) {
    return {
      eligible: false,
      purchasable: false,
      reasons: isPrivileged ? [{ code: 'PRODUCT_NOT_FOUND', message: 'Product not found', nextAction: 'Check product ID', blocking: true }] : [],
    };
  }

  // 1. Store Status (all channels)
  const effectiveStoreId = store?.storeId || store?.id;
  if (!store || (product.storeId && effectiveStoreId && product.storeId !== effectiveStoreId)) {
    addReason('STORE_NOT_FOUND');
  } else if (store.status === 'suspended') {
    addReason('STORE_SUSPENDED');
  } else if (store.status === 'closed') {
    addReason('STORE_CLOSED');
  } else if (store.status !== 'active') {
    addReason('STORE_INACTIVE');
  }

  // 2. Product Status (all channels)
  if (product.status === 'draft') {
    addReason('PRODUCT_DRAFT');
  } else if (product.status === 'archived') {
    addReason('PRODUCT_ARCHIVED');
  } else if (product.status === 'inactive') {
    addReason('PRODUCT_INACTIVE');
  } else if (product.status === 'out_of_stock') {
    addReason('PRODUCT_OUT_OF_STOCK');
  } else if (product.status !== 'active') {
    addReason('PRODUCT_INACTIVE');
  }

  // 3. Moderation Status (all channels)
  const moderation = product.moderationStatus || 'approved';
  if (moderation === 'pending') {
    addReason('PRODUCT_MODERATION_PENDING');
  } else if (moderation === 'flagged') {
    if (product.prohibitedReasonCode && REASON_CODES[product.prohibitedReasonCode]) {
      addReason(product.prohibitedReasonCode);
    } else {
      addReason('PRODUCT_MODERATION_FLAGGED');
    }
  } else if (moderation === 'rejected') {
    if (product.prohibitedReasonCode && REASON_CODES[product.prohibitedReasonCode]) {
      addReason(product.prohibitedReasonCode);
    } else {
      addReason('PRODUCT_MODERATION_REJECTED');
    }
  }

  // 4. SKU / Variant Status (all channels)
  if (variant) {
    if (variant.status !== 'active') {
      addReason('SKU_DISABLED');
    }
  } else if (product.hasVariants) {
    const candidateVariants = variants.length > 0
      ? variants
      : (Array.isArray(product.ProductVariants) ? product.ProductVariants : []);
    const hasActiveVariant = candidateVariants.some((v) => v.status === 'active');
    if (!hasActiveVariant && candidateVariants.length > 0) {
      addReason('NO_ACTIVE_SKU');
    }
  }

  // 5. Channel-Specific Rules
  if (channel === 'marketplace') {
    // Seller approval
    if (store) {
      const approval = store.marketplaceApprovalStatus || 'pending';
      if (approval === 'pending') {
        addReason('SELLER_APPROVAL_PENDING');
      } else if (approval === 'needs_changes') {
        addReason('SELLER_APPROVAL_NEEDS_CHANGES');
      } else if (approval === 'rejected') {
        addReason('SELLER_APPROVAL_REJECTED');
      } else if (approval === 'suspended') {
        addReason('SELLER_APPROVAL_SUSPENDED');
      }

      // Entitlement
      const entitlement = store.marketplaceEntitlement || 'none';
      const capEntitled = store.entitlements?.marketplaceListing !== false;
      if (entitlement !== 'pilot' || !capEntitled) {
        addReason('MARKETPLACE_NOT_ENTITLED');
      }

      // Primary Store Category
      if (store.primaryCategory === null || store.primaryCategory === '' || (store.primaryCategory !== undefined && !String(store.primaryCategory).trim())) {
        addReason('STORE_PRIMARY_CATEGORY_MISSING');
      } else if (store.needsCategoryReview === true) {
        addReason('STORE_CATEGORY_REVIEW_REQUIRED');
      }
    }

    // Product Category
    if (!product.marketplaceCategory || !String(product.marketplaceCategory).trim()) {
      addReason('PRODUCT_MARKETPLACE_CATEGORY_MISSING');
    } else if (!isMarketplaceCategory(product.marketplaceCategory)) {
      addReason('INVALID_MARKETPLACE_CATEGORY');
    }

    // Marketplace Visibility Override
    const vis = product.marketplaceVisibility;
    if (vis === false) {
      addReason('MARKETPLACE_VISIBILITY_DISABLED');
    } else if (vis === null || vis === undefined) {
      if (store && store.marketplaceEnabled === false) {
        addReason('STORE_MARKETPLACE_DISABLED');
      }
    }

    // Delivery Readiness (Release 1 requires flat delivery policy)
    const hasDeliveryPolicy = Boolean(deliveryPolicy && deliveryPolicy.flatFee !== null && deliveryPolicy.flatFee !== undefined);
    if (!hasDeliveryPolicy) {
      addReason('DELIVERY_POLICY_MISSING');
    }
  } else if (channel === 'storefront') {
    // Storefront must be linked
    if (!product.websiteId) {
      addReason('STOREFRONT_NOT_LINKED');
    } else if (store && store.websiteId && product.websiteId !== store.websiteId) {
      addReason('STOREFRONT_TENANT_MISMATCH');
    }

    // Website status
    if (website === null) {
      addReason('WEBSITE_NOT_FOUND');
    } else if (website) {
      if (website.status === 'inactive') {
        addReason('WEBSITE_INACTIVE');
      } else if (website.status === 'suspended') {
        addReason('WEBSITE_SUSPENDED');
      } else if (website.status === 'maintenance') {
        addReason('WEBSITE_MAINTENANCE');
      } else if (website.status !== 'active') {
        addReason('WEBSITE_INACTIVE');
      }
    }

    // Storefront entitlement
    if (store && store.entitlements?.website === false) {
      addReason('STOREFRONT_NOT_ENTITLED');
    }

    // Custom domain browse-only boundary (DEC-003, P2-HOST-003)
    if (hostContext.isCustomDomain) {
      addReason('CUSTOM_DOMAIN_BROWSE_ONLY');
    }
  } else if (channel === 'pos') {
    // POS is operated by merchant/staff in store scope
    // Requires store active, product active, SKU active
  }

  // 6. Stock / Availability Check
  const trackInventory = variant ? (variant.trackInventory !== false) : (product.trackInventory !== false);
  const allowBackorders = Boolean(product.allowBackorders);
  if (trackInventory && !allowBackorders) {
    let effectiveAvailable = null;
    if (inventoryBalance && typeof inventoryBalance.available === 'number') {
      effectiveAvailable = inventoryBalance.available;
    } else if (variant && typeof variant.stockQuantity === 'number') {
      effectiveAvailable = variant.stockQuantity;
    } else if (typeof product.stockQuantity === 'number') {
      effectiveAvailable = product.stockQuantity;
    }

    if (effectiveAvailable !== null && effectiveAvailable <= 0) {
      addReason('OUT_OF_STOCK');
    }
  }

  // 7. Calculate Eligibility & Purchasability
  // Blocking reasons prevent browsing in catalog (fail closed)
  const blockingReasons = reasons.filter((r) => r.blocking !== false);
  const isBrowseEligible = blockingReasons.length === 0;

  // Non-blocking reasons (like OUT_OF_STOCK or CUSTOM_DOMAIN_BROWSE_ONLY) allow browsing but prevent checkout
  const purchaseBlockingReasons = reasons.filter((r) => r.blocking !== false || r.code === 'OUT_OF_STOCK' || r.code === 'CUSTOM_DOMAIN_BROWSE_ONLY' || r.code === 'PRODUCT_OUT_OF_STOCK');
  const isPurchaseEligible = isBrowseEligible && purchaseBlockingReasons.length === 0;

  // 8. Public API Sanitization: Public callers never receive private moderation, KYC, or internal reasons
  const visibleReasons = isPrivileged
    ? reasons
    : []; // Public caller receives clean fail-closed result without internal detail leakage

  const primaryBlocker = visibleReasons.length > 0 ? visibleReasons[0] : null;

  return {
    channel,
    eligible: isBrowseEligible,
    purchasable: isPurchaseEligible,
    reasons: visibleReasons,
    primaryBlocker,
  };
}

/**
 * Evaluates publication and visibility eligibility across all three channels.
 *
 * @param {Object} context
 * @returns {Object} Explanation structure with per-channel breakdown and summary
 */
function evaluatePublicationEligibility(context) {
  const marketplace = evaluateChannel({ ...context, channel: 'marketplace' });
  const storefront = evaluateChannel({ ...context, channel: 'storefront' });
  const pos = evaluateChannel({ ...context, channel: 'pos' });

  const channels = { marketplace, storefront, pos };
  const isPublishedOnAnyChannel = marketplace.eligible || storefront.eligible || pos.eligible;

  // Select primary blocker across channels for quick UI badges
  let primaryBlocker = null;
  if (!marketplace.eligible) {
    primaryBlocker = marketplace.primaryBlocker;
  } else if (!storefront.eligible) {
    primaryBlocker = storefront.primaryBlocker;
  } else if (!pos.eligible) {
    primaryBlocker = pos.primaryBlocker;
  }

  return {
    productId: context.product?.id || null,
    storeId: context.product?.storeId || context.store?.storeId || null,
    status: context.product?.status || null,
    moderationStatus: context.isPrivileged ? (context.product?.moderationStatus || 'approved') : undefined,
    prohibitedReasonCode: context.isPrivileged ? (context.product?.prohibitedReasonCode || null) : undefined,
    moderationNotes: context.isPrivileged ? (context.product?.moderationNotes || null) : undefined,
    appealStatus: context.isPrivileged ? (context.product?.appealStatus || 'none') : undefined,
    canAppeal: context.isPrivileged ? Boolean(context.product?.appealStatus !== 'pending' && ['flagged', 'rejected'].includes(context.product?.moderationStatus)) : undefined,
    isPublished: isPublishedOnAnyChannel,
    channels,
    summary: {
      isPublishedOnAnyChannel,
      primaryBlocker,
    },
  };
}

/**
 * Builds the fail-closed SQL WHERE condition for public marketplace queries.
 *
 * @param {Object} [queryOptions={}]
 * @returns {Object} Sequelize where object
 */
function buildPublicMarketplaceWhere(queryOptions = {}) {
  const where = {
    status: 'active',
    moderationStatus: 'approved',
    marketplaceCategory: { [Op.ne]: null },
    [Op.or]: [
      { marketplaceVisibility: true },
      { marketplaceVisibility: null, '$storeAccess.marketplaceEnabled$': true },
    ],
  };

  if (queryOptions.category) {
    const canon = canonicalCategory(queryOptions.category);
    if (canon) where.marketplaceCategory = canon;
    else where.marketplaceCategory = '__invalid_category_fail_closed__';
  }

  if (queryOptions.storeId) {
    where.storeId = queryOptions.storeId;
  }

  if (queryOptions.search) {
    const search = String(queryOptions.search).trim().slice(0, 120).replace(/[\\%_]/g, '\\$&');
    if (search) where.name = { [Op.like]: `%${search}%` };
  }

  return where;
}

/**
 * Builds the fail-closed SQL WHERE condition for public storefront queries.
 *
 * @param {string} websiteId
 * @param {Object} [queryOptions={}]
 * @returns {Object} Sequelize where object
 */
function buildPublicStorefrontWhere(websiteId, queryOptions = {}) {
  const where = {
    websiteId,
    status: 'active',
    moderationStatus: 'approved',
  };

  if (queryOptions.categoryId) {
    where.categoryId = queryOptions.categoryId;
  }

  if (queryOptions.search) {
    const search = String(queryOptions.search).trim().slice(0, 120).replace(/[\\%_]/g, '\\$&');
    if (search) where.name = { [Op.like]: `%${search}%` };
  }

  return where;
}

/**
 * Database-backed orchestrator: loads all required domain records and evaluates publication eligibility.
 *
 * @param {Object} params
 * @param {string} params.productId
 * @param {string} [params.storeId]
 * @param {string} [params.variantId]
 * @param {string} [params.channel]
 * @param {Object} [params.hostContext]
 * @param {boolean} [params.isPrivileged=true]
 * @param {Object} [options]
 * @param {Object} [options.transaction]
 * @returns {Promise<Object>}
 */
async function getPublicationExplanation(params, options = {}) {
  const { Product, ProductVariant, StoreAccess, WebsiteData, StoreDeliveryPolicy, InventoryBalance } = require('../../models');
  const { productId, storeId: requestedStoreId, variantId, channel, hostContext = {}, isPrivileged = true } = params;
  const transaction = options.transaction || null;

  const product = await Product.findByPk(productId, {
    include: [
      { model: ProductVariant, as: 'ProductVariants', required: false },
    ],
    transaction,
  });

  if (!product) return null;

  const effectiveStoreId = requestedStoreId || product.storeId;

  // Load related domain records in parallel
  const [store, website, deliveryPolicy, variant, inventoryBalance] = await Promise.all([
    effectiveStoreId
      ? StoreAccess.findByPk(effectiveStoreId, { transaction }).catch(() => null)
      : null,
    product.websiteId
      ? WebsiteData.findOne({ where: { websiteId: product.websiteId }, transaction }).catch(() => null)
      : (effectiveStoreId
          ? WebsiteData.findOne({ where: { storeId: effectiveStoreId }, transaction }).catch(() => null)
          : null),
    effectiveStoreId
      ? StoreDeliveryPolicy.findByPk(effectiveStoreId, { transaction }).catch(() => null)
      : null,
    variantId
      ? ProductVariant.findOne({ where: { id: variantId, productId }, transaction }).catch(() => null)
      : null,
    (effectiveStoreId && typeof InventoryBalance?.findOne === 'function')
      ? InventoryBalance.findOne({
          where: { storeId: effectiveStoreId, skuId: variantId || product.id },
          transaction,
        }).catch(() => null)
      : null,
  ]);

  const context = {
    product,
    variant: variant || (product.ProductVariants && product.ProductVariants.find((v) => v.isDefault)),
    variants: product.ProductVariants || [],
    store,
    website,
    deliveryPolicy,
    inventoryBalance,
    channel,
    hostContext,
    isPrivileged,
  };

  if (channel && channel !== 'all') {
    return evaluateChannel(context);
  }

  return evaluatePublicationEligibility(context);
}

module.exports = {
  REASON_CODES,
  evaluateChannel,
  evaluatePublicationEligibility,
  buildPublicMarketplaceWhere,
  buildPublicStorefrontWhere,
  getPublicationExplanation,
};
