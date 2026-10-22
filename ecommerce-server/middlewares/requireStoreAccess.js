const { StoreAccess } = require('../models');

const createRequireStoreAccess = ({ findStore = (id) => StoreAccess.findByPk(id), permissions = [] } = {}) =>
  async (req, res, next) => {
    if (!req.user || req.user.type === 'guest' || req.user.type === 'customer') {
      return res.status(401).json({ error: 'Merchant authentication required' });
    }
    if (req.user.status === 'suspended') {
      return res.status(403).json({ error: 'Account is suspended' });
    }
    const storeId = req.params.storeId || req.body?.storeId || req.query?.storeId;
    if (!storeId) return res.status(400).json({ error: 'Store ID is required' });
    const store = await findStore(storeId);
    if (!store) return res.status(404).json({ error: 'Store not found' });
    if (store.status !== 'active') return res.status(403).json({ error: 'Store is not active' });
    if (req.user.type === 'user' && (req.user.id === store.ownerUserId || req.user.role === 'admin')) {
      req.store = store;
      if (req.user.role === 'admin' && req.user.id !== store.ownerUserId) {
        const { logger } = require('../utils/logger');
        logger.info('AUDIT: Platform admin override access to store', {
          auditEvent: 'ADMIN_OVERRIDE',
          adminUserId: req.user.id,
          storeId: store.storeId,
          path: req.originalUrl || req.path,
          method: req.method,
          timestamp: new Date().toISOString()
        });
      }
      return next();
    }
    const staffPermissions = new Set(req.user.permissions || []);
    if (staffPermissions.has('manage_pos')) staffPermissions.add('pos');
    if (staffPermissions.has('pos')) staffPermissions.add('manage_pos');
    if (staffPermissions.has('manage_orders')) staffPermissions.add('orders');
    if (staffPermissions.has('orders')) staffPermissions.add('manage_orders');
    if (staffPermissions.has('manage_invoices')) {
      staffPermissions.add('invoices');
      staffPermissions.add('invoice');
    }
    if (staffPermissions.has('invoices')) {
      staffPermissions.add('invoice');
      staffPermissions.add('manage_invoices');
    }
    if (staffPermissions.has('invoice')) {
      staffPermissions.add('invoices');
      staffPermissions.add('manage_invoices');
    }
    if (staffPermissions.has('manage_analytics')) staffPermissions.add('analytics');
    if (staffPermissions.has('analytics')) staffPermissions.add('manage_analytics');
    if (req.user.type === 'staff' && req.user.merchantId === store.ownerUserId &&
        (!store.websiteId || !req.user.websiteId || req.user.websiteId === store.websiteId) &&
        (!permissions.length || permissions.some((permission) => staffPermissions.has(permission)))) {
      req.store = store;
      return next();
    }
    return res.status(403).json({ error: 'Store access denied' });
  };

module.exports = { createRequireStoreAccess };
