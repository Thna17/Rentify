const isStaffMember = (website, user) =>
  user?.type === "staff" && Array.isArray(website.staffData) && website.staffData.some((staff) => staff.id === user.id);

const hasRequiredPermission = (user, requiredPermissions = []) => {
  if (!requiredPermissions.length) return true;
  const permissions = new Set(user.permissions || []);
  if (permissions.has('manage_pos')) permissions.add('pos');
  if (permissions.has('pos')) permissions.add('manage_pos');
  if (permissions.has('manage_orders')) permissions.add('orders');
  if (permissions.has('orders')) permissions.add('manage_orders');
  if (permissions.has('manage_products')) permissions.add('products');
  if (permissions.has('products')) permissions.add('manage_products');
  return requiredPermissions.some((permission) => permissions.has(permission));
};

const createRequireWebsiteAccess = ({
  findWebsite = async (websiteId) => {
    const { WebsiteData } = require('../models');
    return (await WebsiteData.findOne({ where: { websiteId } })) || WebsiteData.findByPk(websiteId);
  },
  findStore = async (storeId) => {
    const { StoreAccess } = require('../models');
    return StoreAccess.findByPk(storeId);
  },
  requiredPermissions = [],
} = {}) =>
  async (req, res, next) => {
    if (!req.user || req.user.type === "guest" || req.user.type === "customer") {
      return res.status(401).json({ error: "Merchant authentication required" });
    }

    if (req.user.status === 'suspended') {
      return res.status(403).json({ error: "Account is suspended" });
    }

    // Platform admin override
    if (req.user.type === "user" && req.user.role === "admin") {
      return next();
    }

    // If req.order was already authorized by requireOrderAccess, pass through
    if (req.order && (req.store || req.website)) {
      return next();
    }

    const websiteId = req.params.websiteId || req.body?.websiteId;
    if (!websiteId) return res.status(400).json({ error: "Website ID is required" });

    const website = await findWebsite(websiteId);
    if (!website) {
      // Fallback check: if the provided identifier is actually a storeId
      let store = null;
      try {
        store = await findStore(websiteId);
      } catch {
        store = null;
      }
      if (store) {
        if (store.status !== 'active') return res.status(403).json({ error: "Store is not active" });
        if (req.user.type === "user" && store.ownerUserId === req.user.id) {
          req.store = store;
          return next();
        }
        const staffPermissions = new Set(req.user.permissions || []);
        if (staffPermissions.has('manage_pos')) staffPermissions.add('pos');
        if (staffPermissions.has('pos')) staffPermissions.add('manage_pos');
        if (staffPermissions.has('manage_orders')) staffPermissions.add('orders');
        if (staffPermissions.has('orders')) staffPermissions.add('manage_orders');
        if (staffPermissions.has('manage_products')) staffPermissions.add('products');
        if (staffPermissions.has('products')) staffPermissions.add('manage_products');
        if (req.user.type === "staff" && req.user.merchantId === store.ownerUserId &&
            (!requiredPermissions.length || requiredPermissions.some((p) => staffPermissions.has(p)))) {
          req.store = store;
          return next();
        }
        return res.status(403).json({ error: "Store access denied" });
      }
      return res.status(404).json({ error: "Website not found" });
    }

    // Resolve canonical StoreAccess for website
    let store = null;
    if (website.storeId) {
      try {
        store = await findStore(website.storeId);
      } catch {
        store = null;
      }
      if (store) {
        if (store.status !== 'active') return res.status(403).json({ error: "Store is not active" });
        req.store = store;
      }
    }

    // Reject cross-store mismatch when store context is also provided
    const targetStoreId = req.params.storeId || req.query?.storeId || req.body?.storeId;
    if (targetStoreId && website.storeId && website.storeId !== targetStoreId) {
      return res.status(403).json({ error: "Website does not belong to the requested store" });
    }

    // Store owner
    if (req.user.type === "user" && (website.userId === req.user.id || (store && store.ownerUserId === req.user.id))) {
      req.website = website;
      return next();
    }

    // Staff member
    if (req.user.type === "staff") {
      const isMerchantStaff = (store && req.user.merchantId === store.ownerUserId) ||
                             (website.userId && req.user.merchantId === website.userId) ||
                             isStaffMember(website, req.user);
      const websiteMatch = !req.user.websiteId || req.user.websiteId === website.websiteId ||
                           (store && req.user.websiteId === store.websiteId);
      if (isMerchantStaff && websiteMatch && hasRequiredPermission(req.user, requiredPermissions)) {
        req.website = website;
        return next();
      }
      return res.status(403).json({ error: "Store access denied" });
    }

    return res.status(403).json({ error: "You do not have the required website access" });
  };

const requireWebsiteAccess = createRequireWebsiteAccess();
const requireWebsitePermission = (permissions) => createRequireWebsiteAccess({ requiredPermissions: permissions });

const requireCategoryAccess = async (req, res, next) => {
  const { Category } = require("../models");
  const category = await Category.findByPk(req.params.id);
  if (!category) return res.status(404).json({ error: "Category not found" });
  req.params.websiteId = category.websiteId;
  req.category = category;
  return requireWebsiteAccess(req, res, next);
};

const requireOrderAccess = async (req, res, next) => {
  const { Order, StoreAccess } = require("../models");
  const order = await Order.findByPk(req.params.orderId);
  if (!order) return res.status(404).json({ error: "Order not found" });
  req.order = order;

  // Cross-store / cross-website identifier guessing guard
  const targetStoreId = req.params.storeId || req.query?.storeId || req.body?.storeId;
  if (targetStoreId && order.storeId && order.storeId !== targetStoreId) {
    return res.status(404).json({ error: "Order not found" });
  }
  const targetWebsiteId = req.params.websiteId || req.query?.websiteId || req.body?.websiteId;
  if (targetWebsiteId && order.websiteId && order.websiteId !== targetWebsiteId) {
    return res.status(404).json({ error: "Order not found" });
  }

  // Admin override
  if (req.user?.type === "user" && req.user.role === "admin") {
    if (order.storeId) {
      req.store = await StoreAccess.findByPk(order.storeId);
      req.params.storeId = order.storeId;
    }
    if (order.websiteId) req.params.websiteId = order.websiteId;
    return next();
  }

  if (order.storeId) {
    req.params.storeId = order.storeId;
    const store = await StoreAccess.findByPk(order.storeId);
    if (!store) return res.status(404).json({ error: "Store not found" });
    if (store.status !== 'active') return res.status(403).json({ error: "Store is not active" });
    req.store = store;

    if (req.user?.type === "user" && store.ownerUserId === req.user.id) {
      if (order.websiteId) req.params.websiteId = order.websiteId;
      return next();
    }

    const staffPermissions = new Set(req.user?.permissions || []);
    if (staffPermissions.has('manage_pos')) staffPermissions.add('pos');
    if (staffPermissions.has('pos')) staffPermissions.add('manage_pos');
    if (staffPermissions.has('manage_orders')) staffPermissions.add('orders');
    if (staffPermissions.has('orders')) staffPermissions.add('manage_orders');

    if (req.user?.type === "staff" && req.user.merchantId === store.ownerUserId &&
        (!store.websiteId || !req.user.websiteId || req.user.websiteId === store.websiteId) &&
        (staffPermissions.has('orders') || staffPermissions.has('manage_orders') || staffPermissions.has('pos') || staffPermissions.has('manage_pos'))) {
      if (order.websiteId) req.params.websiteId = order.websiteId;
      return next();
    }
    return res.status(403).json({ error: "Store access denied" });
  }

  if (order.websiteId) {
    req.params.websiteId = order.websiteId;
    return requireWebsiteAccess(req, res, next);
  }
  return res.status(403).json({ error: "Store access denied" });
};

const requireInvoiceAccess = async (req, res, next) => {
  const { Invoice } = require("../models");
  const invoice = await Invoice.findByPk(req.params.invoiceId);
  if (!invoice) return res.status(404).json({ error: "Invoice not found" });
  req.invoice = invoice;
  if (invoice.websiteId) {
    req.params.websiteId = invoice.websiteId;
    return requireWebsitePermission(["invoice", "invoices"])(req, res, next);
  }
  if (invoice.storeId) {
    req.params.storeId = invoice.storeId;
    const { createRequireStoreAccess } = require("./requireStoreAccess");
    return createRequireStoreAccess({ permissions: ["invoice", "invoices", "orders", "manage_orders"] })(req, res, next);
  }
  return requireWebsitePermission(["invoice", "invoices"])(req, res, next);
};

const requirePlatformAdmin = (req, res, next) => {
  if (req.user?.type !== "user" || req.user.role !== "admin") {
    return res.status(403).json({ error: "Platform admin access required" });
  }
  return next();
};

module.exports = { requireWebsiteAccess, requireWebsitePermission, requireOrderAccess, requireInvoiceAccess, requireCategoryAccess, requirePlatformAdmin, createRequireWebsiteAccess };
