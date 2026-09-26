const storeService = require('./storeService');
const storeSyncService = require('../commerce-sync').storeSyncService;
const { asyncHandler } = require('../../utils/helpers');
const { STORE_CATEGORIES } = require('./storeCategories');

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
  return res.json({ success: true, data: store });
});

exports.createStore = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const { store, created } = await storeService.createMarketplaceStore({
    ownerUserId: req.user.id,
    name: body.name,
    primaryCategory: body.primaryCategory,
    marketplaceEnabled: body.marketplaceEnabled ?? true,
  });
  if (created) storeSyncService.syncStore(store.id).catch(() => {});
  return res.status(created ? 201 : 200).json({ success: true, data: store });
});

exports.updateOwnStore = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const store = await storeService.updateOwnStore({
    ownerUserId: req.user.id,
    primaryCategory: body.primaryCategory,
    marketplaceEnabled: body.marketplaceEnabled,
  });
  storeSyncService.syncStore(store.id).catch(() => {});
  return res.json({ success: true, data: store });
});
