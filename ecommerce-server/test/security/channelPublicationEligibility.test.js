'use strict';

// test/security/channelPublicationEligibility.test.js
// Verification suite for P3-CAT-002: Centralized Channel Publication and Visibility Policy.
// Tests:
// 1. All 15 individual policy input dimensions.
// 2. Combinations of multiple blockers and primary blocker prioritization.
// 3. Public fail-closed query generation (SQL WHERE clauses).
// 4. Public API privacy: zero leakage of internal moderation/KYC notes.
// 5. Merchant and admin explanation endpoints with safe nextAction guidance.
// 6. Channel specificity: Marketplace vs Storefront vs POS rules.
// 7. Custom-domain browse-only boundary (browse allowed, checkout blocked).
// 8. Historical orders immutability: product eligibility changes never rewrite orders.

process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1';
process.env.DB_PORT = process.env.DB_PORT || '3308';
process.env.DB_NAME = process.env.DB_NAME || 'rentify_ecommerce_test';
process.env.DB_USER = process.env.DB_USER || 'root';
process.env.DB_PASSWORD = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '';

const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const { sequelize, Sequelize } = require('../../config/db');
const {
  Product,
  ProductVariant,
  StoreAccess,
  WebsiteData,
  StoreDeliveryPolicy,
  InventoryBalance,
  Order,
  OrderItem,
} = require('../../models');

const publicationEligibilityService = require('../../modules/catalog/publicationEligibilityService');
const {
  REASON_CODES,
  evaluateChannel,
  evaluatePublicationEligibility,
  buildPublicMarketplaceWhere,
  buildPublicStorefrontWhere,
  getPublicationExplanation,
} = publicationEligibilityService;

const storeCatalogService = require('../../modules/store-catalog/storeCatalogService');
const platformOperationsController = require('../../modules/admin/platformOperationsController');

// Standard test fixtures for pure evaluation
const baseStore = {
  storeId: 'store-pub-001',
  status: 'active',
  marketplaceApprovalStatus: 'approved',
  marketplaceEntitlement: 'pilot',
  marketplaceEnabled: true,
  primaryCategory: 'Clothing',
  needsCategoryReview: false,
  websiteId: 'website-pub-001',
  entitlements: { marketplaceListing: true, website: true },
};

const baseWebsite = {
  id: 'website-pub-001',
  websiteId: 'website-pub-001',
  storeId: 'store-pub-001',
  status: 'active',
  subdomain: 'artisan-boutique',
};

const baseDeliveryPolicy = {
  storeId: 'store-pub-001',
  flatFee: 2.50,
  currency: 'USD',
};

const baseProduct = {
  id: 'prod-pub-001',
  storeId: 'store-pub-001',
  websiteId: 'website-pub-001',
  name: 'Handcrafted Silk Scarf',
  price: 25.00,
  status: 'active',
  moderationStatus: 'approved',
  marketplaceCategory: 'Clothing',
  marketplaceVisibility: true,
  trackInventory: true,
  stockQuantity: 15,
  allowBackorders: false,
};

const baseVariant = {
  id: 'var-pub-001',
  productId: 'prod-pub-001',
  sku: 'SILK-SCARF-RED',
  status: 'active',
  isDefault: true,
  trackInventory: true,
  stockQuantity: 15,
};

// =========================================================================
// SECTION 1: Pure Evaluation Policy - All 15 Dimensions Tested Individually
// =========================================================================

test('P3-CAT-002 [Dimension 1]: Store status (active vs suspended vs closed vs missing)', () => {
  // 1. Active store -> Eligible
  const activeRes = evaluateChannel({
    product: baseProduct,
    store: { ...baseStore, status: 'active' },
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(activeRes.eligible, true, 'Active store must be eligible');
  assert.equal(activeRes.purchasable, true);

  // 2. Suspended store -> Fails closed with STORE_SUSPENDED
  const suspendedRes = evaluateChannel({
    product: baseProduct,
    store: { ...baseStore, status: 'suspended' },
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(suspendedRes.eligible, false, 'Suspended store product must fail closed');
  assert.equal(suspendedRes.purchasable, false);
  assert.ok(suspendedRes.reasons.some((r) => r.code === 'STORE_SUSPENDED'));
  assert.ok(suspendedRes.primaryBlocker.nextAction.includes('platform operations'));

  // 3. Closed store -> STORE_CLOSED
  const closedRes = evaluateChannel({
    product: baseProduct,
    store: { ...baseStore, status: 'closed' },
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(closedRes.eligible, false);
  assert.ok(closedRes.reasons.some((r) => r.code === 'STORE_CLOSED'));

  // 4. Missing store -> STORE_NOT_FOUND
  const missingRes = evaluateChannel({
    product: baseProduct,
    store: null,
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(missingRes.eligible, false);
  assert.ok(missingRes.reasons.some((r) => r.code === 'STORE_NOT_FOUND'));
});

test('P3-CAT-002 [Dimension 2]: Seller approval status (approved vs pending vs needs_changes vs rejected vs suspended)', () => {
  // Approved -> OK
  const approvedRes = evaluateChannel({
    product: baseProduct,
    store: { ...baseStore, marketplaceApprovalStatus: 'approved' },
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(approvedRes.eligible, true);

  // Pending approval -> SELLER_APPROVAL_PENDING
  const pendingRes = evaluateChannel({
    product: baseProduct,
    store: { ...baseStore, marketplaceApprovalStatus: 'pending' },
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(pendingRes.eligible, false, 'Pending seller must not list on marketplace');
  assert.ok(pendingRes.reasons.some((r) => r.code === 'SELLER_APPROVAL_PENDING'));

  // Needs changes -> SELLER_APPROVAL_NEEDS_CHANGES
  const changesRes = evaluateChannel({
    product: baseProduct,
    store: { ...baseStore, marketplaceApprovalStatus: 'needs_changes' },
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(changesRes.eligible, false);
  assert.ok(changesRes.reasons.some((r) => r.code === 'SELLER_APPROVAL_NEEDS_CHANGES'));

  // Rejected -> SELLER_APPROVAL_REJECTED
  const rejectedRes = evaluateChannel({
    product: baseProduct,
    store: { ...baseStore, marketplaceApprovalStatus: 'rejected' },
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(rejectedRes.eligible, false);
  assert.ok(rejectedRes.reasons.some((r) => r.code === 'SELLER_APPROVAL_REJECTED'));

  // Suspended approval -> SELLER_APPROVAL_SUSPENDED
  const suspendedApprovalRes = evaluateChannel({
    product: baseProduct,
    store: { ...baseStore, marketplaceApprovalStatus: 'suspended' },
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(suspendedApprovalRes.eligible, false);
  assert.ok(suspendedApprovalRes.reasons.some((r) => r.code === 'SELLER_APPROVAL_SUSPENDED'));
});

test('P3-CAT-002 [Dimension 3]: Entitlement (pilot vs none vs capability revoked)', () => {
  // Pilot -> OK
  const pilotRes = evaluateChannel({
    product: baseProduct,
    store: { ...baseStore, marketplaceEntitlement: 'pilot' },
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(pilotRes.eligible, true);

  // None -> MARKETPLACE_NOT_ENTITLED
  const noneRes = evaluateChannel({
    product: baseProduct,
    store: { ...baseStore, marketplaceEntitlement: 'none' },
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(noneRes.eligible, false);
  assert.ok(noneRes.reasons.some((r) => r.code === 'MARKETPLACE_NOT_ENTITLED'));

  // Entitlement capability explicitly revoked
  const revokedRes = evaluateChannel({
    product: baseProduct,
    store: { ...baseStore, entitlements: { marketplaceListing: false } },
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(revokedRes.eligible, false);
  assert.ok(revokedRes.reasons.some((r) => r.code === 'MARKETPLACE_NOT_ENTITLED'));
});

test('P3-CAT-002 [Dimension 4]: Primary Store category (present vs missing vs needsCategoryReview)', () => {
  // Valid category -> OK
  const validRes = evaluateChannel({
    product: baseProduct,
    store: { ...baseStore, primaryCategory: 'Art & Collectibles', needsCategoryReview: false },
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(validRes.eligible, true);

  // Missing primary category -> STORE_PRIMARY_CATEGORY_MISSING
  const missingCatRes = evaluateChannel({
    product: baseProduct,
    store: { ...baseStore, primaryCategory: null },
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(missingCatRes.eligible, false);
  assert.ok(missingCatRes.reasons.some((r) => r.code === 'STORE_PRIMARY_CATEGORY_MISSING'));

  // Needs category review -> STORE_CATEGORY_REVIEW_REQUIRED
  const reviewRes = evaluateChannel({
    product: baseProduct,
    store: { ...baseStore, needsCategoryReview: true },
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(reviewRes.eligible, false);
  assert.ok(reviewRes.reasons.some((r) => r.code === 'STORE_CATEGORY_REVIEW_REQUIRED'));
});

test('P3-CAT-002 [Dimension 5]: Product category (canonical taxonomy vs missing vs invalid)', () => {
  // Canonical category -> OK
  const validCatRes = evaluateChannel({
    product: { ...baseProduct, marketplaceCategory: 'Phones & Devices' },
    store: baseStore,
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(validCatRes.eligible, true);

  // Missing marketplaceCategory -> PRODUCT_MARKETPLACE_CATEGORY_MISSING
  const missingCatRes = evaluateChannel({
    product: { ...baseProduct, marketplaceCategory: null },
    store: baseStore,
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(missingCatRes.eligible, false);
  assert.ok(missingCatRes.reasons.some((r) => r.code === 'PRODUCT_MARKETPLACE_CATEGORY_MISSING'));

  // Invalid taxonomy category -> INVALID_MARKETPLACE_CATEGORY
  const invalidCatRes = evaluateChannel({
    product: { ...baseProduct, marketplaceCategory: 'NonExistentBogusCategory123' },
    store: baseStore,
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(invalidCatRes.eligible, false);
  assert.ok(invalidCatRes.reasons.some((r) => r.code === 'INVALID_MARKETPLACE_CATEGORY'));
});

test('P3-CAT-002 [Dimension 6]: Product status (active vs draft vs archived vs inactive vs out_of_stock)', () => {
  // Active -> OK
  const activeRes = evaluateChannel({
    product: { ...baseProduct, status: 'active' },
    store: baseStore,
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(activeRes.eligible, true);
  assert.equal(activeRes.purchasable, true);

  // Draft -> PRODUCT_DRAFT (fail closed)
  const draftRes = evaluateChannel({
    product: { ...baseProduct, status: 'draft' },
    store: baseStore,
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(draftRes.eligible, false);
  assert.equal(draftRes.purchasable, false);
  assert.ok(draftRes.reasons.some((r) => r.code === 'PRODUCT_DRAFT'));

  // Archived -> PRODUCT_ARCHIVED
  const archivedRes = evaluateChannel({
    product: { ...baseProduct, status: 'archived' },
    store: baseStore,
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(archivedRes.eligible, false);
  assert.ok(archivedRes.reasons.some((r) => r.code === 'PRODUCT_ARCHIVED'));

  // Inactive -> PRODUCT_INACTIVE
  const inactiveRes = evaluateChannel({
    product: { ...baseProduct, status: 'inactive' },
    store: baseStore,
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(inactiveRes.eligible, false);
  assert.ok(inactiveRes.reasons.some((r) => r.code === 'PRODUCT_INACTIVE'));

  // out_of_stock status: Browsable with badge, but NOT purchasable!
  const oosRes = evaluateChannel({
    product: { ...baseProduct, status: 'out_of_stock' },
    store: baseStore,
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(oosRes.eligible, true, 'Out of stock status should remain browse-eligible with badge');
  assert.equal(oosRes.purchasable, false, 'Out of stock status must block purchasing');
  assert.ok(oosRes.reasons.some((r) => r.code === 'PRODUCT_OUT_OF_STOCK'));
});

test('P3-CAT-002 [Dimension 7]: SKU status (active variant vs disabled variant vs no active SKUs)', () => {
  // Active variant -> OK
  const activeVarRes = evaluateChannel({
    product: baseProduct,
    variant: { ...baseVariant, status: 'active' },
    store: baseStore,
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(activeVarRes.eligible, true);

  // Disabled variant -> SKU_DISABLED
  const disabledVarRes = evaluateChannel({
    product: baseProduct,
    variant: { ...baseVariant, status: 'disabled' },
    store: baseStore,
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(disabledVarRes.eligible, false);
  assert.ok(disabledVarRes.reasons.some((r) => r.code === 'SKU_DISABLED'));

  // Product with hasVariants=true and zero active variants -> NO_ACTIVE_SKU
  const noActiveSkuRes = evaluateChannel({
    product: { ...baseProduct, hasVariants: true },
    variants: [
      { id: 'v1', status: 'disabled' },
      { id: 'v2', status: 'inactive' },
    ],
    store: baseStore,
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(noActiveSkuRes.eligible, false);
  assert.ok(noActiveSkuRes.reasons.some((r) => r.code === 'NO_ACTIVE_SKU'));
});

test('P3-CAT-002 [Dimension 8]: Moderation status (approved vs pending vs flagged vs rejected)', () => {
  // Approved -> OK
  const approvedRes = evaluateChannel({
    product: { ...baseProduct, moderationStatus: 'approved' },
    store: baseStore,
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(approvedRes.eligible, true);

  // Pending moderation -> PRODUCT_MODERATION_PENDING (fail closed)
  const pendingRes = evaluateChannel({
    product: { ...baseProduct, moderationStatus: 'pending' },
    store: baseStore,
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(pendingRes.eligible, false, 'Pending moderation must fail closed');
  assert.equal(pendingRes.purchasable, false);
  assert.ok(pendingRes.reasons.some((r) => r.code === 'PRODUCT_MODERATION_PENDING'));

  // Flagged -> PRODUCT_MODERATION_FLAGGED
  const flaggedRes = evaluateChannel({
    product: { ...baseProduct, moderationStatus: 'flagged' },
    store: baseStore,
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(flaggedRes.eligible, false);
  assert.ok(flaggedRes.reasons.some((r) => r.code === 'PRODUCT_MODERATION_FLAGGED'));

  // Rejected -> PRODUCT_MODERATION_REJECTED
  const rejectedRes = evaluateChannel({
    product: { ...baseProduct, moderationStatus: 'rejected' },
    store: baseStore,
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(rejectedRes.eligible, false);
  assert.ok(rejectedRes.reasons.some((r) => r.code === 'PRODUCT_MODERATION_REJECTED'));
});

test('P3-CAT-002 [Dimension 9]: Marketplace visibility (opt-in vs opt-out vs store disabled)', () => {
  // Per-product explicit true -> OK
  const optInRes = evaluateChannel({
    product: { ...baseProduct, marketplaceVisibility: true },
    store: { ...baseStore, marketplaceEnabled: false }, // product override wins
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(optInRes.eligible, true, 'Explicit product override true must be eligible');

  // Per-product explicit false -> MARKETPLACE_VISIBILITY_DISABLED
  const optOutRes = evaluateChannel({
    product: { ...baseProduct, marketplaceVisibility: false },
    store: baseStore,
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(optOutRes.eligible, false);
  assert.ok(optOutRes.reasons.some((r) => r.code === 'MARKETPLACE_VISIBILITY_DISABLED'));

  // Inherit store default (product visibility is null) with store disabled -> STORE_MARKETPLACE_DISABLED
  const storeDisabledRes = evaluateChannel({
    product: { ...baseProduct, marketplaceVisibility: null },
    store: { ...baseStore, marketplaceEnabled: false },
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(storeDisabledRes.eligible, false);
  assert.ok(storeDisabledRes.reasons.some((r) => r.code === 'STORE_MARKETPLACE_DISABLED'));
});

test('P3-CAT-002 [Dimension 10]: Storefront visibility (linked website vs unlinked vs tenant mismatch)', () => {
  // Matching linked website -> OK
  const linkedRes = evaluateChannel({
    product: { ...baseProduct, websiteId: 'website-pub-001' },
    store: { ...baseStore, websiteId: 'website-pub-001' },
    website: baseWebsite,
    channel: 'storefront',
    isPrivileged: true,
  });
  assert.equal(linkedRes.eligible, true);

  // Unlinked product (websiteId is null) -> STOREFRONT_NOT_LINKED
  const unlinkedRes = evaluateChannel({
    product: { ...baseProduct, websiteId: null },
    store: baseStore,
    website: baseWebsite,
    channel: 'storefront',
    isPrivileged: true,
  });
  assert.equal(unlinkedRes.eligible, false);
  assert.ok(unlinkedRes.reasons.some((r) => r.code === 'STOREFRONT_NOT_LINKED'));

  // Tenant mismatch (product.websiteId does not match store.websiteId) -> STOREFRONT_TENANT_MISMATCH
  const mismatchRes = evaluateChannel({
    product: { ...baseProduct, websiteId: 'wrong-website-id' },
    store: { ...baseStore, websiteId: 'website-pub-001' },
    website: baseWebsite,
    channel: 'storefront',
    isPrivileged: true,
  });
  assert.equal(mismatchRes.eligible, false);
  assert.ok(mismatchRes.reasons.some((r) => r.code === 'STOREFRONT_TENANT_MISMATCH'));
});

test('P3-CAT-002 [Dimension 11]: Website status (active vs inactive vs suspended vs maintenance)', () => {
  // Active -> OK
  const activeWebRes = evaluateChannel({
    product: baseProduct,
    store: baseStore,
    website: { ...baseWebsite, status: 'active' },
    channel: 'storefront',
    isPrivileged: true,
  });
  assert.equal(activeWebRes.eligible, true);

  // Inactive -> WEBSITE_INACTIVE
  const inactiveWebRes = evaluateChannel({
    product: baseProduct,
    store: baseStore,
    website: { ...baseWebsite, status: 'inactive' },
    channel: 'storefront',
    isPrivileged: true,
  });
  assert.equal(inactiveWebRes.eligible, false);
  assert.ok(inactiveWebRes.reasons.some((r) => r.code === 'WEBSITE_INACTIVE'));

  // Suspended -> WEBSITE_SUSPENDED
  const suspendedWebRes = evaluateChannel({
    product: baseProduct,
    store: baseStore,
    website: { ...baseWebsite, status: 'suspended' },
    channel: 'storefront',
    isPrivileged: true,
  });
  assert.equal(suspendedWebRes.eligible, false);
  assert.ok(suspendedWebRes.reasons.some((r) => r.code === 'WEBSITE_SUSPENDED'));

  // Maintenance -> WEBSITE_MAINTENANCE
  const maintWebRes = evaluateChannel({
    product: baseProduct,
    store: baseStore,
    website: { ...baseWebsite, status: 'maintenance' },
    channel: 'storefront',
    isPrivileged: true,
  });
  assert.equal(maintWebRes.eligible, false);
  assert.ok(maintWebRes.reasons.some((r) => r.code === 'WEBSITE_MAINTENANCE'));
});

test('P3-CAT-002 [Dimension 12]: Stock & inventory availability (in-stock vs OOS vs backorders allowed vs untracked)', () => {
  // 1. Stock available (available > 0) -> Browse eligible and purchasable
  const inStockRes = evaluateChannel({
    product: { ...baseProduct, trackInventory: true, stockQuantity: 10 },
    inventoryBalance: { available: 5 },
    store: baseStore,
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(inStockRes.eligible, true);
  assert.equal(inStockRes.purchasable, true);

  // 2. Out of stock (available = 0, no backorders) -> Browse eligible with badge, but NOT purchasable
  const oosRes = evaluateChannel({
    product: { ...baseProduct, trackInventory: true, allowBackorders: false },
    inventoryBalance: { available: 0 },
    store: baseStore,
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(oosRes.eligible, true, 'OOS product must remain browse-eligible');
  assert.equal(oosRes.purchasable, false, 'OOS product must block purchasing');
  assert.ok(oosRes.reasons.some((r) => r.code === 'OUT_OF_STOCK'));

  // 3. Out of stock with backorders allowed -> In-stock and purchasable
  const backorderRes = evaluateChannel({
    product: { ...baseProduct, trackInventory: true, allowBackorders: true },
    inventoryBalance: { available: 0 },
    store: baseStore,
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(backorderRes.eligible, true);
  assert.equal(backorderRes.purchasable, true);
  assert.equal(backorderRes.reasons.some((r) => r.code === 'OUT_OF_STOCK'), false);

  // 4. Untracked inventory (trackInventory = false) -> Always purchasable regardless of balance
  const untrackedRes = evaluateChannel({
    product: { ...baseProduct, trackInventory: false, allowBackorders: false },
    inventoryBalance: { available: 0 },
    store: baseStore,
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(untrackedRes.eligible, true);
  assert.equal(untrackedRes.purchasable, true);
  assert.equal(untrackedRes.reasons.some((r) => r.code === 'OUT_OF_STOCK'), false);
});

test('P3-CAT-002 [Dimension 13]: Delivery readiness (configured flat fee vs missing delivery policy)', () => {
  // Configured policy with flat fee -> OK
  const readyRes = evaluateChannel({
    product: baseProduct,
    store: baseStore,
    deliveryPolicy: { storeId: 'store-pub-001', flatFee: 3.00 },
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(readyRes.eligible, true);

  // Missing delivery policy -> DELIVERY_POLICY_MISSING
  const missingPolicyRes = evaluateChannel({
    product: baseProduct,
    store: baseStore,
    deliveryPolicy: null,
    channel: 'marketplace',
    isPrivileged: true,
  });
  assert.equal(missingPolicyRes.eligible, false);
  assert.ok(missingPolicyRes.reasons.some((r) => r.code === 'DELIVERY_POLICY_MISSING'));
});

test('P3-CAT-002 [Dimension 14]: Channel specificity (marketplace vs storefront vs pos)', () => {
  // Storefront channel does NOT require seller approval, marketplace entitlement, or delivery policy
  const storefrontRes = evaluateChannel({
    product: baseProduct,
    store: {
      ...baseStore,
      marketplaceApprovalStatus: 'pending', // unapproved for marketplace!
      marketplaceEntitlement: 'none',       // not entitled for marketplace!
    },
    website: baseWebsite,
    deliveryPolicy: null,                   // no delivery policy!
    channel: 'storefront',
    isPrivileged: true,
  });
  assert.equal(storefrontRes.eligible, true, 'Storefront should succeed without marketplace seller approval');
  assert.equal(storefrontRes.purchasable, true);

  // POS channel does NOT require storefront website or marketplace delivery policy
  const posRes = evaluateChannel({
    product: { ...baseProduct, websiteId: null }, // no website!
    store: { ...baseStore, websiteId: null },
    deliveryPolicy: null,                         // no delivery policy!
    channel: 'pos',
    isPrivileged: true,
  });
  assert.equal(posRes.eligible, true, 'POS should succeed for in-person transactions');
  assert.equal(posRes.purchasable, true);
});

test('P3-CAT-002 [Dimension 15]: Custom-domain browse-only boundary (browse allowed, checkout blocked)', () => {
  // Browsing on custom domain -> eligible: true, purchasable: false with CUSTOM_DOMAIN_BROWSE_ONLY
  const customDomainRes = evaluateChannel({
    product: baseProduct,
    store: baseStore,
    website: baseWebsite,
    channel: 'storefront',
    hostContext: { isCustomDomain: true, isHostedStorefront: false },
    isPrivileged: true,
  });
  assert.equal(customDomainRes.eligible, true, 'Custom domain must allow browsing products');
  assert.equal(customDomainRes.purchasable, false, 'Custom domain must block purchasing in Release 1');
  assert.ok(customDomainRes.reasons.some((r) => r.code === 'CUSTOM_DOMAIN_BROWSE_ONLY'));
  assert.ok(customDomainRes.reasons.find((r) => r.code === 'CUSTOM_DOMAIN_BROWSE_ONLY').nextAction.includes('hosted subdomain'));

  // Hosted subdomain -> eligible: true and purchasable: true
  const hostedRes = evaluateChannel({
    product: baseProduct,
    store: baseStore,
    website: baseWebsite,
    channel: 'storefront',
    hostContext: { isCustomDomain: false, isHostedStorefront: true },
    isPrivileged: true,
  });
  assert.equal(hostedRes.eligible, true);
  assert.equal(hostedRes.purchasable, true);
  assert.equal(hostedRes.reasons.some((r) => r.code === 'CUSTOM_DOMAIN_BROWSE_ONLY'), false);
});

// =========================================================================
// SECTION 2: Combinations of Blockers & Prioritization
// =========================================================================

test('P3-CAT-002: Multiple simultaneous blockers are captured and prioritized safely', () => {
  // A product in a suspended store, in draft, with pending moderation and no delivery policy
  const multiBlockerContext = {
    product: {
      ...baseProduct,
      status: 'draft',
      moderationStatus: 'pending',
    },
    store: {
      ...baseStore,
      status: 'suspended',
      marketplaceApprovalStatus: 'pending',
    },
    deliveryPolicy: null,
    channel: 'marketplace',
    isPrivileged: true,
  };

  const res = evaluateChannel(multiBlockerContext);
  assert.equal(res.eligible, false);
  assert.equal(res.purchasable, false);

  const codes = res.reasons.map((r) => r.code);
  assert.ok(codes.includes('STORE_SUSPENDED'), 'Must include store suspended');
  assert.ok(codes.includes('PRODUCT_DRAFT'), 'Must include product draft');
  assert.ok(codes.includes('PRODUCT_MODERATION_PENDING'), 'Must include moderation pending');
  assert.ok(codes.includes('SELLER_APPROVAL_PENDING'), 'Must include seller pending');
  assert.ok(codes.includes('DELIVERY_POLICY_MISSING'), 'Must include delivery policy missing');

  // Verify primary blocker is the first encountered blocker (store suspended)
  assert.equal(res.primaryBlocker.code, 'STORE_SUSPENDED');
  assert.ok(res.primaryBlocker.message.length > 0);
  assert.ok(res.primaryBlocker.nextAction.length > 0);

  // Full cross-channel summary
  const fullSummary = evaluatePublicationEligibility(multiBlockerContext);
  assert.equal(fullSummary.isPublished, false);
  assert.equal(fullSummary.summary.isPublishedOnAnyChannel, false);
  assert.equal(fullSummary.summary.primaryBlocker.code, 'STORE_SUSPENDED');
});

// =========================================================================
// SECTION 3: Public Fail-Closed Behavior & API Privacy
// =========================================================================

test('P3-CAT-002: Public fail-closed query generation (buildPublicMarketplaceWhere and buildPublicStorefrontWhere)', () => {
  // 1. Marketplace public where clause
  const mktWhere = buildPublicMarketplaceWhere({ category: 'Clothing' });
  assert.equal(mktWhere.status, 'active', 'Marketplace public queries must require active status');
  assert.equal(mktWhere.moderationStatus, 'approved', 'Marketplace public queries must require approved moderation');
  assert.equal(mktWhere.marketplaceCategory, 'Clothing');

  // Invalid category fails closed
  const invalidMktWhere = buildPublicMarketplaceWhere({ category: 'InvalidGarbageCategory' });
  assert.equal(invalidMktWhere.marketplaceCategory, '__invalid_category_fail_closed__');

  // 2. Storefront public where clause
  const sfWhere = buildPublicStorefrontWhere('website-pub-001', { categoryId: 'cat-123' });
  assert.equal(sfWhere.websiteId, 'website-pub-001');
  assert.equal(sfWhere.status, 'active', 'Storefront public queries must require active status');
  assert.equal(sfWhere.moderationStatus, 'approved', 'Storefront public queries must require approved moderation');
  assert.equal(sfWhere.categoryId, 'cat-123');
});

test('P3-CAT-002: Public API privacy: zero leakage of internal moderation or KYC details', () => {
  // Unprivileged (public buyer) querying a product undergoing moderation review
  const publicPendingRes = evaluateChannel({
    product: { ...baseProduct, moderationStatus: 'pending' },
    store: baseStore,
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: false, // PUBLIC CONSUMER
  });

  assert.equal(publicPendingRes.eligible, false, 'Public must see item as ineligible (404/filtered)');
  assert.equal(publicPendingRes.purchasable, false);
  assert.deepEqual(publicPendingRes.reasons, [], 'Public callers must receive empty reasons array');
  assert.equal(publicPendingRes.primaryBlocker, null, 'Public callers must receive null primary blocker');

  // Privileged (merchant/admin) caller receives full reasons
  const privilegedRes = evaluateChannel({
    product: { ...baseProduct, moderationStatus: 'pending' },
    store: baseStore,
    deliveryPolicy: baseDeliveryPolicy,
    channel: 'marketplace',
    isPrivileged: true, // MERCHANT / ADMIN
  });
  assert.ok(privilegedRes.reasons.length > 0);
  assert.equal(privilegedRes.reasons[0].code, 'PRODUCT_MODERATION_PENDING');
  assert.ok(privilegedRes.primaryBlocker.nextAction.includes('moderation review'));
});

// =========================================================================
// SECTION 4: Database-Backed Explanation & API Endpoints
// =========================================================================

test('P3-CAT-002: Database-backed explanation and merchant/admin endpoints', async () => {
  const storeId = randomUUID();
  const ownerId = randomUUID();
  const websiteId = randomUUID();
  const productId = randomUUID();
  const variantId = randomUUID();

  // Create store access
  await StoreAccess.create({
    storeId,
    ownerUserId: ownerId,
    status: 'active',
    marketplaceApprovalStatus: 'approved',
    marketplaceEnabled: true,
    marketplaceEntitlement: 'pilot',
    primaryCategory: 'Handmade Crafts',
    needsCategoryReview: false,
    websiteId,
    version: 1,
  });

  // Create website
  await WebsiteData.create({
    id: websiteId,
    websiteId,
    storeId,
    userId: ownerId,
    status: 'active',
    subdomain: `test-shop-${randomUUID().slice(0, 8)}`,
  });

  // Create delivery policy
  await StoreDeliveryPolicy.create({
    storeId,
    flatFee: 3.50,
    currency: 'USD',
  });

  // Create product
  await Product.create({
    id: productId,
    storeId,
    websiteId,
    name: 'Vintage Leather Journal',
    price: 34.00,
    status: 'active',
    moderationStatus: 'approved',
    marketplaceCategory: 'Handmade Crafts',
    marketplaceVisibility: true,
    trackInventory: true,
    stockQuantity: 20,
    allowBackorders: false,
    currency: 'USD',
    hasVariants: false,
    websiteNiche: 'ecommerce',
    slug: `vintage-journal-${randomUUID().slice(0, 8)}`,
  });

  // Create variant
  await ProductVariant.create({
    id: variantId,
    storeId,
    productId,
    sku: `JRNL-${randomUUID().slice(0, 6)}`,
    status: 'active',
    isDefault: true,
    trackInventory: true,
    stockQuantity: 20,
    price: 34.00,
  });

  // 1. Test getPublicationExplanation database-backed loader
  const explanation = await getPublicationExplanation({
    productId,
    storeId,
    isPrivileged: true,
  });

  assert.ok(explanation, 'Explanation must be loaded');
  assert.equal(explanation.isPublished, true);
  assert.equal(explanation.channels.marketplace.eligible, true);
  assert.equal(explanation.channels.storefront.eligible, true);
  assert.equal(explanation.channels.pos.eligible, true);

  // 2. Test store catalog service getPublicationStatus for store owner
  const merchantStoreAccess = { storeId, ownerUserId: ownerId };
  const merchantResult = await storeCatalogService.getPublicationStatus(storeId, productId, {
    storeAccess: merchantStoreAccess,
  });
  assert.ok(merchantResult);
  assert.equal(merchantResult.isPublished, true);

  // 3. Test unauthorized merchant cannot access another store's product publication status
  const wrongStoreId = randomUUID();
  await assert.rejects(
    async () => {
      await storeCatalogService.getPublicationStatus(wrongStoreId, productId);
    },
    /Product not found for this store/i,
    'Unauthorized merchant must be rejected'
  );

  // 4. Test admin platform operations publication status endpoint
  let adminJsonResult = null;
  let adminStatus = 200;
  const mockAdminReq = { params: { id: productId }, query: {} };
  const mockAdminRes = {
    status: (s) => { adminStatus = s; return mockAdminRes; },
    json: (payload) => { adminJsonResult = payload; return mockAdminRes; },
  };

  await platformOperationsController.productPublicationStatus(mockAdminReq, mockAdminRes);
  assert.equal(adminStatus, 200);
  assert.ok(adminJsonResult.data);
  assert.equal(adminJsonResult.data.isPublished, true);
});

// =========================================================================
// SECTION 5: Historical Orders Immutability Invariant
// =========================================================================

test('P3-CAT-002: Historical orders immutability: product eligibility changes never rewrite historical orders', async () => {
  const storeId = randomUUID();
  const ownerId = randomUUID();
  const websiteId = randomUUID();
  const productId = randomUUID();
  const variantId = randomUUID();
  const orderId = randomUUID();
  const orderItemId = randomUUID();

  // 1. Create active product and store
  await StoreAccess.create({
    storeId,
    ownerUserId: ownerId,
    status: 'active',
    marketplaceApprovalStatus: 'approved',
    marketplaceEnabled: true,
    marketplaceEntitlement: 'pilot',
    primaryCategory: 'Home Goods',
    websiteId,
    version: 1,
  });

  await WebsiteData.create({
    id: websiteId,
    websiteId,
    storeId,
    userId: ownerId,
    status: 'active',
    subdomain: `test-teapot-${randomUUID().slice(0, 8)}`,
  });

  await Product.create({
    id: productId,
    storeId,
    websiteId,
    name: 'Ceramic Teapot',
    price: 45.00,
    status: 'active',
    moderationStatus: 'approved',
    marketplaceCategory: 'Home Goods',
    trackInventory: true,
    stockQuantity: 10,
    currency: 'USD',
    hasVariants: false,
    websiteNiche: 'ecommerce',
    slug: `ceramic-teapot-${randomUUID().slice(0, 8)}`,
  });

  await ProductVariant.create({
    id: variantId,
    storeId,
    productId,
    sku: `TEAPOT-${randomUUID().slice(0, 6)}`,
    status: 'active',
    isDefault: true,
    price: 45.00,
  });

  // 2. Place an order with immutable snapshot
  const orderSnapshot = {
    version: 1,
    moneyMinor: {
      subtotalMinor: 4500,
      discountTotalMinor: 0,
      taxTotalMinor: 0,
      shippingFeeMinor: 500,
      totalAmountMinor: 5000,
    },
    policy: { flatFee: 5.00 },
  };

  const lineSnapshot = {
    productId,
    variantId,
    sku: `TEAPOT-${randomUUID().slice(0, 6)}`,
    title: 'Ceramic Teapot',
    unitPrice: 45.00,
    quantity: 1,
    subtotal: 45.00,
  };

  await Order.create({
    id: orderId,
    orderNumber: `ORD-${Date.now().toString(36).toUpperCase()}`,
    storeId,
    websiteId,
    salesChannel: 'marketplace',
    status: 'completed',
    fulfillmentStatus: 'fulfilled',
    paymentStatus: 'paid',
    subtotal: 45.00,
    shippingFee: 5.00,
    totalAmount: 50.00,
    currency: 'USD',
    orderSnapshot,
  });

  await OrderItem.create({
    id: orderItemId,
    orderId,
    productId,
    variantId,
    name: 'Ceramic Teapot',
    basePrice: 45.00,
    price: 45.00,
    total: 45.00,
    quantity: 1,
    lineSnapshot,
  });

  // 3. Later modify the product: archive it, reject moderation, suspend store
  await Product.update(
    {
      status: 'archived',
      moderationStatus: 'rejected',
    },
    { where: { id: productId } }
  );

  await StoreAccess.update(
    {
      status: 'suspended',
      marketplaceApprovalStatus: 'suspended',
    },
    { where: { storeId } }
  );

  // 4. Verify product publication policy correctly reports the product as completely ineligible
  const productNow = await Product.findByPk(productId);
  const updatedExplanation = evaluatePublicationEligibility({
    product: productNow,
    store: await StoreAccess.findByPk(storeId),
    deliveryPolicy: null,
    isPrivileged: true,
  });
  assert.equal(updatedExplanation.isPublished, false, 'Product must now be unpublishable');
  assert.equal(updatedExplanation.channels.marketplace.eligible, false);

  // 5. Verify the historical order remains 100% intact and untouched
  const orderRecord = await Order.findByPk(orderId, {
    include: [{ model: OrderItem, as: 'OrderItems' }],
  });

  assert.ok(orderRecord, 'Historical order must still exist');
  assert.equal(orderRecord.status, 'completed');
  assert.equal(orderRecord.totalAmount, '50.00');
  assert.deepEqual(orderRecord.orderSnapshot, orderSnapshot, 'Order snapshot must be immutable');

  assert.ok(orderRecord.OrderItems && orderRecord.OrderItems.length === 1);
  assert.equal(orderRecord.OrderItems[0].name, 'Ceramic Teapot');
  assert.equal(orderRecord.OrderItems[0].price, '45.00');
  assert.deepEqual(orderRecord.OrderItems[0].lineSnapshot, lineSnapshot, 'Line snapshot must be immutable');
});
