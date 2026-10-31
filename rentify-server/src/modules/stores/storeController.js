const storeService = require('./storeService');
const { hostedStorefrontUrl } = require('../../utils/hostedStorefrontOrigin');
const storeSyncService = require('../commerce-sync').storeSyncService;
const { asyncHandler } = require('../../utils/helpers');
const { STORE_CATEGORIES } = require('./storeCategories');
const { cloudinaryUploadService, uploadController } = require('../media');
const { respondToUploadError } = uploadController;
const launchChecklistService = require('./launchChecklistService');

exports.getCategories = (req, res) => res.json({ success: true, data: STORE_CATEGORIES });

exports.listPublicStores = asyncHandler(async (req, res) => {
  const stores = await storeService.listPublicStores(req.query.ids);
  return res.json({ success: true, data: stores });
});

// A live online store is public already, so shoppers on the marketplace can be sent there
const liveWebsiteUrl = async (storeId) => {
  const { Website } = require('../../models');
  const website = await Website.findOne({
    where: { storeId, status: 'active' },
    attributes: ['domain', 'subdomain'],
  });
  if (website?.subdomain) return hostedStorefrontUrl(website.subdomain);
  if (website?.domain) {
    if (/^https?:\/\//.test(website.domain)) return website.domain;
    return `${/localhost|127\.0\.0\.1/.test(website.domain) ? 'http' : 'https'}://${website.domain}`;
  }
  return null;
};

exports.getPublicStore = asyncHandler(async (req, res) => {
  const store = await storeService.getPublicStore(req.params.storeId);
  if (!store) return res.status(404).json({ message: 'Store not found' });
  const plain = typeof store.toJSON === 'function' ? store.toJSON() : { ...store };
  const websiteUrl = await liveWebsiteUrl(plain.id).catch(() => null);
  return res.json({ success: true, data: { ...plain, websiteUrl } });
});

exports.getOwnStore = asyncHandler(async (req, res) => {
  const store = await storeService.getOwnStore(req.user.id);
  if (!store) return res.status(404).json({ message: 'Store not found' });
  let website = null;
  try {
    const { Website } = require('../../models');
    website = await Website.findOne({
      where: { storeId: store.id },
      attributes: ['id', 'domain', 'subdomain', 'status', 'templateId', 'subscriptionId'],
    });
  } catch {
    // Ignore if Website lookup fails in isolated test contexts
  }
  let entitlements = null;
  try {
    const { entitlementService } = require('../billing');
    entitlements = await entitlementService.evaluateStoreEntitlements(store.id, { store, website });
  } catch {
    // Fallback in isolated test contexts
  }
  const plain = typeof store.toJSON === 'function' ? store.toJSON() : { ...store };
  return res.json({
    success: true,
    data: {
      ...plain,
      websiteId: website?.id || plain.websiteId || null,
      // A website published on its Rentify subdomain may have no custom domain yet
      websiteDomain: website?.domain
        || (website?.subdomain ? new URL(hostedStorefrontUrl(website.subdomain)).host : null),
      websiteStatus: website?.status || null,
      entitlements,
    },
  });
});

exports.getLaunchChecklist = asyncHandler(async (req, res) => {
  const data = await launchChecklistService.getForActor(req.user.id);
  return res.json({ success: true, data });
});

exports.getStoreEntitlements = asyncHandler(async (req, res) => {
  const storeId = req.params.storeId;
  const { entitlementService } = require('../billing');
  const entitlements = await entitlementService.evaluateStoreEntitlements(storeId);
  return res.json({ success: true, data: entitlements });
});

exports.getOwnStoreEntitlements = asyncHandler(async (req, res) => {
  const store = await storeService.getOwnStore(req.user.id);
  if (!store) return res.status(404).json({ message: 'Store not found' });
  const { entitlementService } = require('../billing');
  const entitlements = await entitlementService.evaluateStoreEntitlements(store.id, { store });
  return res.json({ success: true, data: entitlements });
});

exports.createStore = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const { store, created } = await storeService.createMarketplaceStore({
    ownerUserId: req.user.id,
    name: body.name,
    primaryCategory: body.primaryCategory,
    marketplaceEnabled: body.marketplaceEnabled ?? true,
  });
  await storeSyncService.syncStore(store.id).catch(() => {});
  return res.status(created ? 201 : 200).json({ success: true, data: store });
});

/** POST /api/stores/mine/logo (multipart field "logo"): uploads and saves the owner's store logo. */
exports.uploadOwnLogo = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Choose a logo image' });
  const own = await storeService.getOwnStore(req.user.id);
  if (!own) return res.status(404).json({ error: 'Store not found' });
  // Staff can see the store, but only its owner changes how it is presented.
  if (own.ownerUserId !== req.user.id) return res.status(403).json({ error: 'Only the store owner can change the logo' });

  let uploaded;
  try {
    uploaded = await cloudinaryUploadService.uploadBuffer(req.file.buffer, { folder: `rentify/stores/${own.id}/logo` });
  } catch (error) {
    return respondToUploadError(res, error);
  }
  const store = await storeService.updateOwnStore({ ownerUserId: req.user.id, logoUrl: uploaded.url });
  await storeSyncService.syncStore(store.id).catch(() => {});
  return res.json({ success: true, data: store });
});

exports.updateOwnStore = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const store = await storeService.updateOwnStore({
    ownerUserId: req.user.id,
    primaryCategory: body.primaryCategory,
    marketplaceEnabled: body.marketplaceEnabled,
    logoUrl: body.logoUrl,
    marketplaceColor: body.marketplaceColor,
  });
  await storeSyncService.syncStore(store.id).catch(() => {});
  return res.json({ success: true, data: store });
});

