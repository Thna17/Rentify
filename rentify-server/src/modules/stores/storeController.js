const storeService = require('./storeService');
const storeSyncService = require('../commerce-sync').storeSyncService;
const { asyncHandler } = require('../../utils/helpers');
const { STORE_CATEGORIES } = require('./storeCategories');
const { cloudinaryUploadService, uploadController } = require('../media');
const { respondToUploadError } = uploadController;

exports.getCategories = (req, res) => res.json({ success: true, data: STORE_CATEGORIES });

exports.listPublicStores = asyncHandler(async (req, res) => {
  const stores = await storeService.listPublicStores(req.query.ids);
  return res.json({ success: true, data: stores });
});

exports.getPublicStore = asyncHandler(async (req, res) => {
  const store = await storeService.getPublicStore(req.params.storeId);
  if (!store) return res.status(404).json({ message: 'Store not found' });
  return res.json({ success: true, data: store });
});

exports.getOwnStore = asyncHandler(async (req, res) => {
  const store = await storeService.getOwnStore(req.user.id);
  if (!store) return res.status(404).json({ message: 'Store not found' });
  let website = null;
  try {
    const { Website } = require('../../models');
    website = await Website.findOne({
      where: { storeId: store.id },
      attributes: ['id', 'domain', 'status', 'templateId', 'subscriptionId'],
    });
  } catch {
    // Ignore if Website lookup fails in isolated test contexts
  }
  const plain = typeof store.toJSON === 'function' ? store.toJSON() : { ...store };
  return res.json({
    success: true,
    data: {
      ...plain,
      websiteId: website?.id || plain.websiteId || null,
      websiteDomain: website?.domain || null,
      websiteStatus: website?.status || null,
    },
  });
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
  });
  await storeSyncService.syncStore(store.id).catch(() => {});
  return res.json({ success: true, data: store });
});

