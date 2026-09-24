const { StoreAccess } = require('../models');

const createRequireStoreAccess = ({ findStore = (id) => StoreAccess.findByPk(id), permissions = [] } = {}) =>
  async (req, res, next) => {
    if (!req.user || req.user.type === 'guest' || req.user.type === 'customer') {
      return res.status(401).json({ error: 'Merchant authentication required' });
    }
    const storeId = req.params.storeId || req.body?.storeId;
    if (!storeId) return res.status(400).json({ error: 'Store ID is required' });
    const store = await findStore(storeId);
    if (!store) return res.status(404).json({ error: 'Store not found' });
    if (store.status !== 'active') return res.status(403).json({ error: 'Store is not active' });
    if (req.user.type === 'user' && req.user.id === store.ownerUserId) {
      req.store = store;
      return next();
    }
    const staffPermissions = new Set(req.user.permissions || []);
    if (req.user.type === 'staff' && req.user.merchantId === store.ownerUserId &&
        store.websiteId && req.user.websiteId === store.websiteId &&
        permissions.some((permission) => staffPermissions.has(permission))) {
      req.store = store;
      return next();
    }
    return res.status(403).json({ error: 'Store access denied' });
  };

module.exports = { createRequireStoreAccess };
