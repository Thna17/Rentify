const isStaffMember = (website, user) =>
  user?.type === "staff" && Array.isArray(website.staffData) && website.staffData.some((staff) => staff.id === user.id);

const hasRequiredPermission = (user, requiredPermissions = []) => {
  if (!requiredPermissions.length) return true;
  const permissions = new Set(user.permissions || []);
  return requiredPermissions.some((permission) => permissions.has(permission));
};

const createRequireWebsiteAccess = ({
  findWebsite = async (websiteId) => {
    const { WebsiteData } = require('../models');
    return (await WebsiteData.findOne({ where: { websiteId } })) || WebsiteData.findByPk(websiteId);
  },
  requiredPermissions = [],
} = {}) =>
  async (req, res, next) => {
    if (!req.user || req.user.type === "guest" || req.user.type === "customer") {
      return res.status(401).json({ error: "Merchant authentication required" });
    }

    const websiteId = req.params.websiteId || req.body?.websiteId;
    if (!websiteId) return res.status(400).json({ error: "Website ID is required" });

    const website = await findWebsite(websiteId);
    if (!website) return res.status(404).json({ error: "Website not found" });
    if (req.user.type === "user" && website.userId === req.user.id) {
      req.website = website;
      return next();
    }
    if (isStaffMember(website, req.user) && hasRequiredPermission(req.user, requiredPermissions)) {
      req.website = website;
      return next();
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
  const { Order } = require("../models");
  const order = await Order.findByPk(req.params.orderId);
  if (!order) return res.status(404).json({ error: "Order not found" });
  req.params.websiteId = order.websiteId;
  req.order = order;
  return requireWebsiteAccess(req, res, next);
};

const requireInvoiceAccess = async (req, res, next) => {
  const { Invoice } = require("../models");
  const invoice = await Invoice.findByPk(req.params.invoiceId);
  if (!invoice) return res.status(404).json({ error: "Invoice not found" });
  req.params.websiteId = invoice.websiteId;
  req.invoice = invoice;
  return requireWebsitePermission(["invoice", "invoices"])(req, res, next);
};

const requirePlatformAdmin = (req, res, next) => {
  if (req.user?.type !== "user" || req.user.role !== "admin") {
    return res.status(403).json({ error: "Platform admin access required" });
  }
  return next();
};

module.exports = { requireWebsiteAccess, requireWebsitePermission, requireOrderAccess, requireInvoiceAccess, requireCategoryAccess, requirePlatformAdmin, createRequireWebsiteAccess };
