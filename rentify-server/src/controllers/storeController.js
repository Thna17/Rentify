const storeService = require('../services/storeService');
const { asyncHandler } = require('../utils/helpers');

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
  return res.status(created ? 201 : 200).json({ success: true, data: store });
});

exports.updateOwnStore = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const store = await storeService.updateOwnStore({
    ownerUserId: req.user.id,
    primaryCategory: body.primaryCategory,
    marketplaceEnabled: body.marketplaceEnabled,
  });
  return res.json({ success: true, data: store });
});
