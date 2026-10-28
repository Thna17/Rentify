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

function applicationStatus(store, application, prerequisitesComplete) {
  if (store.marketplaceApprovalStatus === 'approved' || application?.status === 'approved') {
    return item('seller_application', 'complete');
  }
  if (store.marketplaceApprovalStatus === 'suspended') {
    return item('seller_application', 'failed', 'SELLER_SUSPENDED', 'CONTACT_SUPPORT', application?.reviewReason);
  }
  if (application?.status === 'pending') {
    return item('seller_application', 'pending', 'APPLICATION_UNDER_REVIEW', null);
  }
  if (application?.status === 'needs_changes') {
    return item('seller_application', 'failed', 'APPLICATION_NEEDS_CHANGES', 'UPDATE_APPLICATION', application.reviewReason);
  }
  if (application?.status === 'rejected') {
    return item('seller_application', 'failed', 'APPLICATION_REJECTED', 'UPDATE_APPLICATION', application.reviewReason);
  }
  if (!prerequisitesComplete) {
    return item('seller_application', 'blocked', 'APPLICATION_PREREQUISITES_MISSING', 'COMPLETE_REQUIRED_ITEMS');
  }
  return item('seller_application', 'incomplete', 'APPLICATION_NOT_SUBMITTED', 'SUBMIT_APPLICATION');
}

function approvalStatus(store, application) {
  const status = store.marketplaceApprovalStatus;
  if (status === 'approved') return item('approval', 'complete');
  if (status === 'suspended') return item('approval', 'failed', 'SELLER_SUSPENDED', 'CONTACT_SUPPORT', application?.reviewReason);
  if (status === 'needs_changes') return item('approval', 'failed', 'APPROVAL_NEEDS_CHANGES', 'UPDATE_APPLICATION', application?.reviewReason);
  if (status === 'rejected') return item('approval', 'failed', 'APPROVAL_REJECTED', 'UPDATE_APPLICATION', application?.reviewReason);
  if (application?.status === 'pending') return item('approval', 'pending', 'APPROVAL_PENDING');
  return item('approval', 'blocked', 'APPLICATION_REQUIRED_FOR_APPROVAL', 'SUBMIT_APPLICATION');
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
    : application?.acceptsDeliveryResponsibility && commerceFacts.deliveryPolicyConfigured
      ? item('delivery_policy', 'complete')
      : item('delivery_policy', 'incomplete', application ? 'DELIVERY_POLICY_INCOMPLETE' : 'DELIVERY_POLICY_REQUIRED', application ? 'UPDATE_APPLICATION' : 'SUBMIT_APPLICATION');
  const returns = application?.acceptsReturnsResponsibility && application?.acceptsRefundResponsibility
    ? item('return_policy', 'complete')
    : item('return_policy', 'incomplete', application ? 'RETURN_POLICY_INCOMPLETE' : 'RETURN_POLICY_REQUIRED', application ? 'UPDATE_APPLICATION' : 'SUBMIT_APPLICATION');

  let product;
  if (commerceStale) product = item('first_product_sku', 'blocked', staleReasonCode, 'RETRY_CHECKLIST');
  else if (!commerceFacts.hasValidProduct) product = item('first_product_sku', 'incomplete', 'VALID_PRODUCT_REQUIRED', 'ADD_PRODUCT');
  else if (!commerceFacts.hasValidSku) product = item('first_product_sku', 'incomplete', 'VALID_SKU_REQUIRED', 'ADD_SKU');
  else product = item('first_product_sku', 'complete');

  const prerequisitesComplete = [storeDetails, contact, category, product].every((entry) => entry.status === 'complete');
  const sellerApplication = applicationStatus(store, application, prerequisitesComplete);
  const approval = approvalStatus(store, application);
  const storefront = storefrontStatus(website);
  const preview = product.status !== 'complete'
    ? item('preview', 'blocked', 'VALID_PRODUCT_REQUIRED_FOR_PREVIEW', product.nextAction?.code || 'ADD_PRODUCT')
    : storefront?.status === 'failed'
      ? item('preview', 'blocked', 'STOREFRONT_NOT_READY_FOR_PREVIEW', 'REVIEW_STOREFRONT')
      : item('preview', 'complete', null, 'PREVIEW_STORE');

  let marketplacePublication;
  if (!store.marketplaceEnabled) marketplacePublication = item('publication_marketplace', 'blocked', 'MARKETPLACE_DISABLED', 'ENABLE_MARKETPLACE');
  else if (approval.status === 'pending') marketplacePublication = item('publication_marketplace', 'pending', 'APPROVAL_PENDING');
  else if (approval.status !== 'complete') marketplacePublication = item('publication_marketplace', 'blocked', 'APPROVAL_REQUIRED', approval.nextAction?.code || 'SUBMIT_APPLICATION');
  else if (commerceStale) marketplacePublication = item('publication_marketplace', 'blocked', staleReasonCode, 'RETRY_CHECKLIST');
  else if (!commerceFacts.marketplaceProductReady || product.status !== 'complete') marketplacePublication = item('publication_marketplace', 'incomplete', 'MARKETPLACE_PRODUCT_NOT_READY', 'REVIEW_PRODUCT_VISIBILITY');
  else if (delivery.status !== 'complete' || returns.status !== 'complete') marketplacePublication = item('publication_marketplace', 'blocked', 'POLICIES_REQUIRED_FOR_PUBLICATION', 'UPDATE_APPLICATION');
  else marketplacePublication = item('publication_marketplace', 'complete', null, 'VIEW_MARKETPLACE');

  let storefrontPublication = null;
  if (website) {
    if (storefront.status === 'failed') storefrontPublication = item('publication_storefront', 'failed', storefront.reasonCode, storefront.nextAction?.code);
    else if (storefront.status === 'pending') storefrontPublication = item('publication_storefront', 'pending', 'STOREFRONT_PREPARING');
    else if (storefront.status !== 'complete') storefrontPublication = item('publication_storefront', 'blocked', 'STOREFRONT_NOT_ACTIVE', 'CUSTOMIZE_STOREFRONT');
    else if (product.status !== 'complete') storefrontPublication = item('publication_storefront', 'blocked', 'VALID_PRODUCT_REQUIRED', product.nextAction?.code || 'ADD_PRODUCT');
    else storefrontPublication = item('publication_storefront', 'complete', null, 'VIEW_STOREFRONT');
  }

  const items = [storeDetails, contact, category, delivery, returns, product, sellerApplication];
  if (storefront) items.push(storefront);
  items.push(preview, approval, marketplacePublication);
  if (storefrontPublication) items.push(storefrontPublication);
  const completeCount = items.filter((entry) => entry.status === 'complete').length;

  return {
    version: 1,
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
