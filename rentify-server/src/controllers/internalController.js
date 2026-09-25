const { Store, Website, User } = require('../models');
const { asyncHandler } = require('../utils/helpers');

const contactFrom = (user) => user && {
  id: user.id,
  name: user.name,
  email: user.email,
  phoneNumber: user.phoneNumber,
  telegramChatId: user.telegramChatId,
};

// Marketplace orders: the store's owner.
exports.getStoreOwnerContact = asyncHandler(async (req, res) => {
  const store = await Store.findByPk(req.params.storeId);
  if (!store) return res.status(404).json({ message: 'Store not found' });
  const owner = await User.findByPk(store.ownerUserId);
  if (!owner) return res.status(404).json({ message: 'Store owner not found' });
  return res.json({ success: true, data: contactFrom(owner) });
});

// Storefront orders: the website's owner.
exports.getWebsiteOwnerContact = asyncHandler(async (req, res) => {
  const website = await Website.findByPk(req.params.websiteId);
  if (!website) return res.status(404).json({ message: 'Website not found' });
  const owner = await User.findByPk(website.userId);
  if (!owner) return res.status(404).json({ message: 'Website owner not found' });
  return res.json({ success: true, data: contactFrom(owner) });
});
