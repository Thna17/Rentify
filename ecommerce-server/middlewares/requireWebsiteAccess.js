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
  if (permissions.has('manage_invoices')) {
    permissions.add('invoices');
    permissions.add('invoice');
  }
  if (permissions.has('invoices')) {
    permissions.add('invoice');
    permissions.add('manage_invoices');
  }
  if (permissions.has('invoice')) {
    permissions.add('invoices');
    permissions.add('manage_invoices');
  }
  if (permissions.has('manage_analytics')) permissions.add('analytics');
  if (permissions.has('analytics')) permissions.add('manage_analytics');
  if (permissions.has('manage_reports')) permissions.add('reports');
  if (permissions.has('reports')) permissions.add('manage_reports');
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
      const { logger } = require("../utils/logger");
      logger.info("AUDIT: Platform admin override access to website", {
        auditEvent: "ADMIN_OVERRIDE",
        adminUserId: req.user.id,
        websiteId: req.params.websiteId || req.body?.websiteId,
        path: req.originalUrl || req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      });
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
    if (store.status !== 'active') {
      const { getStoreEntitlements } = require('../modules/store-access/storeAccessService');
      const entitlements = getStoreEntitlements(store);
      if (req.method !== 'GET' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Store is not active" });
      }
      if (!entitlements.capabilities.historicalOrderRead && req.user?.role !== 'admin') {
        return res.status(403).json({
          error: entitlements.restrictionReason || "Historical order read access expired (90 days post-suspension limit reached)",
          code: "HISTORICAL_ACCESS_EXPIRED"
        });
      }
    }
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

const requirePaymentOrderAccess = async (req, res, next) => {
  const { Payment, Order } = require("../models");
  const paymentId = req.params.paymentId;
  if (!paymentId) return res.status(400).json({ error: "Payment ID is required" });

  const payment = await Payment.findByPk(paymentId, {
    include: [{ model: Order, as: "Order", required: false }],
  });
  if (!payment) return res.status(404).json({ error: "Payment not found" });

  req.payment = payment;
  const order = payment.Order || (payment.orderId ? await Order.findByPk(payment.orderId) : null);
  if (!order) return res.status(404).json({ error: "Order not found for payment" });

  req.order = order;
  req.params.orderId = order.id;
  return requireOrderAccess(req, res, next);
};

const requireInvoiceAccess = async (req, res, next) => {
  const { Invoice, StoreAccess, WebsiteData, Order } = require("../models");
  const { invoiceId } = req.params;

  if (!invoiceId) {
    return res.status(400).json({ error: "Invoice ID is required" });
  }

  // 1. Public / unauthenticated check
  // Public invoice access must use an approved unguessable token or remain unavailable
  if (!req.user || req.user.type === "guest") {
    const token = req.query?.token;
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }
    return res.status(401).json({ error: "Public invoice access is not enabled" });
  }

  // 2. Suspended actor check
  if (req.user.status === "suspended") {
    return res.status(403).json({ error: "Account is suspended" });
  }

  // 3. Find invoice
  let invoice = null;
  try {
    invoice = await Invoice.findByPk(invoiceId, {
      include: [{ model: Order, as: "Order", required: false }],
    });
  } catch (err) {
    // If DB error or not found
    invoice = null;
  }

  if (!invoice) {
    return res.status(404).json({ error: "Invoice not found" });
  }
  req.invoice = invoice;

  // 4. Resolve canonical Store
  let storeId = invoice.storeId;
  let website = null;
  if (!storeId && invoice.websiteId) {
    try {
      website = await WebsiteData.findOne({
        where: { websiteId: invoice.websiteId },
        attributes: ["storeId", "websiteId", "userId", "staffData"],
      });
      if (website?.storeId) {
        storeId = website.storeId;
      }
    } catch {
      website = null;
    }
  }

  // Cross-store parameter mismatch guard
  const targetStoreId = req.params.storeId || req.query?.storeId || req.body?.storeId;
  if (targetStoreId && storeId && storeId !== targetStoreId) {
    return res.status(404).json({ error: "Invoice not found" });
  }

  // 5. Platform admin override with audit logging
  if (req.user.type === "user" && req.user.role === "admin") {
    const { logger } = require("../utils/logger");
    logger.info("AUDIT: Admin override access to invoice", {
      auditEvent: "ADMIN_OVERRIDE",
      adminUserId: req.user.id,
      invoiceId: invoice.id,
      storeId,
      path: req.originalUrl || req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    });
    return next();
  }

  // 6. Buyer / Customer check (accessing their own order's invoice)
  if (req.user.type === "customer" || req.user.type === "user") {
    const order = invoice.Order || (invoice.orderId ? await Order.findByPk(invoice.orderId).catch(() => null) : null);
    const isOrderBuyer = order && (
      (req.user.type === "customer" && order.userId === req.user.id) ||
      (req.user.type === "user" && order.buyerId === req.user.id)
    );
    if (isOrderBuyer) {
      return next();
    }
  }

  // 7. Store Owner & Staff check
  let store = null;
  if (storeId) {
    try {
      store = await StoreAccess.findByPk(storeId);
    } catch {
      store = null;
    }
    if (store && store.status !== "active") {
      const { getStoreEntitlements } = require('../modules/store-access/storeAccessService');
      const entitlements = getStoreEntitlements(store);
      if (req.method !== 'GET' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Store is not active" });
      }
      if (!entitlements.capabilities.historicalOrderRead && req.user?.role !== 'admin') {
        return res.status(403).json({
          error: entitlements.restrictionReason || "Historical invoice read access expired (90 days post-suspension limit reached)",
          code: "HISTORICAL_ACCESS_EXPIRED"
        });
      }
    }
  }

  // Store owner
  const isOwner = (store && req.user.type === "user" && store.ownerUserId === req.user.id) ||
                  (website && req.user.type === "user" && website.userId === req.user.id);
  if (isOwner) {
    req.store = store;
    return next();
  }

  // Staff check
  if (req.user.type === "staff") {
    const isStaffOfStore = (store && req.user.merchantId === store.ownerUserId) ||
                           (website && req.user.merchantId === website.userId);
    if (!isStaffOfStore) {
      // Unrelated staff: 404 to prevent ID guessing across stores
      return res.status(404).json({ error: "Invoice not found" });
    }
    const staffPermissions = new Set(req.user.permissions || []);
    if (staffPermissions.has("manage_pos")) staffPermissions.add("pos");
    if (staffPermissions.has("pos")) staffPermissions.add("manage_pos");
    if (staffPermissions.has("manage_orders")) staffPermissions.add("orders");
    if (staffPermissions.has("orders")) staffPermissions.add("manage_orders");
    if (staffPermissions.has("manage_invoices")) {
      staffPermissions.add("invoices");
      staffPermissions.add("invoice");
    }
    if (staffPermissions.has("invoices")) {
      staffPermissions.add("invoice");
      staffPermissions.add("manage_invoices");
    }
    if (staffPermissions.has("invoice")) {
      staffPermissions.add("invoices");
      staffPermissions.add("manage_invoices");
    }

    const hasPermission = staffPermissions.has("invoice") ||
                          staffPermissions.has("invoices") ||
                          staffPermissions.has("manage_invoices") ||
                          staffPermissions.has("orders") ||
                          staffPermissions.has("manage_orders");

    if (hasPermission) {
      req.store = store;
      return next();
    }
    // Staff of the same store without invoice permission: 403 Store access denied
    return res.status(403).json({ error: "Store access denied" });
  }

  // Unrelated merchant / other actor: 404 to prevent direct-ID guessing
  return res.status(404).json({ error: "Invoice not found" });
};

const requirePlatformAdmin = (req, res, next) => {
  if (req.user?.type !== "user" || req.user.role !== "admin") {
    return res.status(403).json({ error: "Platform admin access required" });
  }
  const { logger } = require("../utils/logger");
  logger.info("AUDIT: Platform admin operation accessed", {
    auditEvent: "ADMIN_OPERATION",
    adminUserId: req.user.id,
    path: req.originalUrl || req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
  return next();
};

module.exports = { requireWebsiteAccess, requireWebsitePermission, requireOrderAccess, requirePaymentOrderAccess, requireInvoiceAccess, requireCategoryAccess, requirePlatformAdmin, createRequireWebsiteAccess };
