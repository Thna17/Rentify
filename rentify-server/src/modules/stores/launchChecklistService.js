const { Website, User, SellerApplication } = require('../../models');
const storeService = require('./storeService');
const storeSyncService = require('../commerce-sync').storeSyncService;

const STATUSES = new Set(['complete', 'incomplete', 'blocked', 'pending', 'failed']);

function item(id, status, reasonCode = null, actionCode = null, detail = null) {
  if (!STATUSES.has(status)) throw new Error(`Invalid launch checklist status: ${status}`);
  return {
    id,
    status,
    reasonCode,
    nextAction: actionCode ? { code: actionCode } : null,
    detail: typeof detail === 'string' ? detail.slice(0, 500) : null,
  };
}

// Marketplace listing is automatic (DEC-028): there is no seller application or review step.
// A Store that is not approved is either still missing an automatic-listing requirement
// (pending) or was moderated by an admin (suspended, needs_changes, rejected).
function listingStatus(store, application, requirements) {
  const status = store.marketplaceApprovalStatus;
  if (status === 'approved') return null;
  if (status === 'suspended') return item('publication_marketplace', 'failed', 'SELLER_SUSPENDED', 'CONTACT_SUPPORT', application?.reviewReason);
  if (status === 'needs_changes' || status === 'rejected') {
    return item('publication_marketplace', 'failed', 'MARKETPLACE_LISTING_REMOVED', 'CONTACT_SUPPORT', application?.reviewReason);
  }
  const missing = requirements.find((entry) => entry.status !== 'complete');
  return item('publication_marketplace', 'blocked', 'LISTING_REQUIREMENTS_MISSING', missing?.nextAction?.code || 'CONTACT_SUPPORT');
}

function storefrontStatus(website) {
  if (!website) return null;
  if (!website.templateId) return item('storefront_readiness', 'blocked', 'STOREFRONT_TEMPLATE_REQUIRED', 'CHOOSE_TEMPLATE');
  if (['failed', 'suspended', 'expired', 'archived', 'deleted'].includes(website.status)) {
    return item('storefront_readiness', 'failed', `STOREFRONT_${website.status.toUpperCase()}`, 'REVIEW_STOREFRONT');
  }
  if (['building', 'pending'].includes(website.status)) {
    return item('storefront_readiness', 'pending', 'STOREFRONT_PREPARING');
  }
  if (website.status === 'active') return item('storefront_readiness', 'complete');
  return item('storefront_readiness', 'incomplete', 'STOREFRONT_CUSTOMIZATION_REQUIRED', 'CUSTOMIZE_STOREFRONT');
}

function buildChecklist({ store, owner, website, application, commerceFacts, commerceReasonCode = null }) {
  const commerceStale = !commerceFacts || !Number.isSafeInteger(Number(commerceFacts.storeProjectionVersion)) ||
    Number(commerceFacts.storeProjectionVersion) !== Number(store.projectionVersion);
  const staleReasonCode = commerceReasonCode || (commerceStale ? 'COMMERCE_PROJECTION_STALE' : null);
  const storeDetails = store.name && store.status === 'active'
    ? item('store_details', 'complete')
    : item('store_details', store.status === 'active' ? 'incomplete' : 'blocked', store.status === 'active' ? 'STORE_DETAILS_MISSING' : 'STORE_NOT_ACTIVE', store.status === 'active' ? 'EDIT_STORE_DETAILS' : 'CONTACT_SUPPORT');
  const contact = owner?.isVerified && (owner.email || owner.phoneNumber)
    ? item('verified_contact', 'complete')
    : item('verified_contact', 'incomplete', 'CONTACT_NOT_VERIFIED', 'VERIFY_CONTACT');
  const category = store.primaryCategory && !store.needsCategoryReview
    ? item('primary_category', 'complete')
    : item('primary_category', 'incomplete', 'PRIMARY_CATEGORY_REQUIRED', 'SET_PRIMARY_CATEGORY');

  const delivery = commerceStale
    ? item('delivery_policy', 'blocked', staleReasonCode, 'RETRY_CHECKLIST')
    : commerceFacts.deliveryPolicyConfigured
      ? item('delivery_policy', 'complete')
      : item('delivery_policy', 'incomplete', 'DELIVERY_POLICY_REQUIRED', 'SET_DELIVERY_FEE');

  let product;
  if (commerceStale) product = item('first_product_sku', 'blocked', staleReasonCode, 'RETRY_CHECKLIST');
  else if (!commerceFacts.hasValidProduct) product = item('first_product_sku', 'incomplete', 'VALID_PRODUCT_REQUIRED', 'ADD_PRODUCT');
  else if (!commerceFacts.hasValidSku) product = item('first_product_sku', 'incomplete', 'VALID_SKU_REQUIRED', 'ADD_SKU');
  else product = item('first_product_sku', 'complete');

  const storefront = storefrontStatus(website);
  const preview = product.status !== 'complete'
    ? item('preview', 'blocked', 'VALID_PRODUCT_REQUIRED_FOR_PREVIEW', product.nextAction?.code || 'ADD_PRODUCT')
    : storefront?.status === 'failed'
      ? item('preview', 'blocked', 'STOREFRONT_NOT_READY_FOR_PREVIEW', 'REVIEW_STOREFRONT')
      : item('preview', 'complete', null, 'PREVIEW_STORE');

  let marketplacePublication;
  const listing = listingStatus(store, application, [storeDetails, contact, category]);
  if (!store.marketplaceEnabled) marketplacePublication = item('publication_marketplace', 'blocked', 'MARKETPLACE_DISABLED', 'ENABLE_MARKETPLACE');
  else if (listing) marketplacePublication = listing;
  else if (commerceStale) marketplacePublication = item('publication_marketplace', 'blocked', staleReasonCode, 'RETRY_CHECKLIST');
  else if (product.status !== 'complete') marketplacePublication = item('publication_marketplace', 'blocked', 'VALID_PRODUCT_REQUIRED', product.nextAction?.code || 'ADD_PRODUCT');
  else if (!commerceFacts.marketplaceProductReady) marketplacePublication = item('publication_marketplace', 'incomplete', 'MARKETPLACE_PRODUCT_NOT_READY', 'REVIEW_PRODUCT_VISIBILITY');
  else if (delivery.status !== 'complete') marketplacePublication = item('publication_marketplace', 'blocked', 'DELIVERY_POLICY_REQUIRED', 'SET_DELIVERY_FEE');
  else marketplacePublication = item('publication_marketplace', 'complete', null, 'VIEW_MARKETPLACE');

  let storefrontPublication = null;
  if (website) {
    if (storefront.status === 'failed') storefrontPublication = item('publication_storefront', 'failed', storefront.reasonCode, storefront.nextAction?.code);
    else if (storefront.status === 'pending') storefrontPublication = item('publication_storefront', 'pending', 'STOREFRONT_PREPARING');
    else if (storefront.status !== 'complete') storefrontPublication = item('publication_storefront', 'blocked', 'STOREFRONT_NOT_ACTIVE', 'CUSTOMIZE_STOREFRONT');
    else if (product.status !== 'complete') storefrontPublication = item('publication_storefront', 'blocked', 'VALID_PRODUCT_REQUIRED', product.nextAction?.code || 'ADD_PRODUCT');
    else storefrontPublication = item('publication_storefront', 'complete', null, 'VIEW_STOREFRONT');
  }

  const items = [storeDetails, contact, category, delivery, product];
  if (storefront) items.push(storefront);
  items.push(preview, marketplacePublication);
  if (storefrontPublication) items.push(storefrontPublication);
  const completeCount = items.filter((entry) => entry.status === 'complete').length;

  return {
    version: 2,
    observedAt: new Date().toISOString(),
    stale: commerceStale,
    staleReasonCode,
    merchantPath: website ? 'storefront' : 'marketplace',
    summary: {
      completeCount,
      totalCount: items.length,
      pendingCount: items.filter((entry) => entry.status === 'pending').length,
      blockedCount: items.filter((entry) => entry.status === 'blocked').length,
      failedCount: items.filter((entry) => entry.status === 'failed').length,
    },
    channels: {
      marketplace: { enabled: Boolean(store.marketplaceEnabled), publicationStatus: marketplacePublication.status },
      storefront: website ? { applicable: true, status: website.status, publicationStatus: storefrontPublication.status } : { applicable: false },
    },
    items,
  };
}

async function getForActor(actorUserId) {
  const store = await storeService.getOwnStore(actorUserId);
  if (!store) {
    const error = new Error('Store not found');
    error.statusCode = 404;
    throw error;
  }
  const [owner, website, application] = await Promise.all([
    User.findByPk(store.ownerUserId, { attributes: ['id', 'email', 'phoneNumber', 'isVerified'] }),
    Website.findOne({ where: { storeId: store.id }, attributes: ['id', 'storeId', 'templateId', 'status', 'domain', 'subdomain'] }),
    SellerApplication.findByPk(store.id),
  ]);

  let commerceFacts = null;
  let commerceReasonCode = null;
  try {
    const response = await storeSyncService.apiClient.get(`/api/store-access/internal/${store.id}/launch-facts`);
    commerceFacts = response.data?.data || null;
  } catch (error) {
    commerceReasonCode = error.code === 'ECONNABORTED' ? 'COMMERCE_FACTS_TIMEOUT' : 'COMMERCE_FACTS_UNAVAILABLE';
  }
  return buildChecklist({ store, owner, website, application, commerceFacts, commerceReasonCode });
}

module.exports = { buildChecklist, getForActor };
