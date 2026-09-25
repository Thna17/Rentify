const deny = (res, status, error) => res.status(status).json({ error });

const createRequireAdmin = ({ findUser = (id) => require("../models").User.findByPk(id, { attributes: ["id", "role"] }) } = {}) =>
  async (req, res, next) => {
    if (!req.user?.id) return deny(res, 401, "Unauthorized");

    const user = await findUser(req.user.id);
    if (!user) return deny(res, 401, "Unauthorized");
    if (user.role !== "admin") return deny(res, 403, "Admin access required");

    req.user.role = user.role;
    return next();
  };

const requireAdmin = createRequireAdmin();

const createRequireWebsiteOwner = ({ findWebsite = (id) => require("../models").Website.findByPk(id) } = {}) =>
  async (req, res, next) => {
    if (!req.user?.id) return deny(res, 401, "Unauthorized");

    const websiteId = req.params.websiteId || req.body?.websiteId;
    if (!websiteId) return deny(res, 400, "Website ID is required");

    const website = await findWebsite(websiteId);
    if (!website) return deny(res, 404, "Website not found");
    if (req.user.role !== "admin" && website.userId !== req.user.id) {
      return deny(res, 403, "You do not have access to this website");
    }

    req.website = website;
    return next();
  };

const requireWebsiteOwner = createRequireWebsiteOwner();

const createRequireStoreAccess = ({ findStore = (id) => require('../models').Store.findByPk(id) } = {}) =>
  async (req, res, next) => {
    if (!req.user?.id) return deny(res, 401, 'Unauthorized');
    const storeId = req.params.storeId || req.body?.storeId;
    if (!storeId) return deny(res, 400, 'Store ID is required');

    const store = await findStore(storeId);
    if (!store) return deny(res, 404, 'Store not found');
    if (store.status !== 'active') return deny(res, 403, 'Store is not active');

    const isOwner = store.ownerUserId === req.user.id;
    const permissions = new Set(req.user.permissions || []);
    const isPermittedStaff = req.user.role === 'staff' &&
      req.user.merchantId === store.ownerUserId &&
      (permissions.has('products') || permissions.has('manage_products'));
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isPermittedStaff && !isAdmin) {
      return deny(res, 403, 'You do not have access to this store');
    }

    req.store = store;
    return next();
  };

const requireStoreAccess = createRequireStoreAccess();

const createRequireContentOwner = ({ findContent = (id) => require("../models").WebsiteContent.findByPk(id) } = {}) =>
  async (req, res, next) => {
    if (!req.user?.id) return deny(res, 401, "Unauthorized");
    const content = await findContent(req.params.contentId);
    if (!content) return deny(res, 404, "Content not found");

    const { Website } = require("../models");
    const website = await Website.findByPk(content.websiteId);
    if (!website) return deny(res, 404, "Website not found");
    if (req.user.role !== "admin" && website.userId !== req.user.id) {
      return deny(res, 403, "You do not have access to this website");
    }

    req.website = website;
    req.websiteContent = content;
    return next();
  };

const requireContentOwner = createRequireContentOwner();

module.exports = {
  requireAdmin,
  requireWebsiteOwner,
  requireContentOwner,
  createRequireAdmin,
  createRequireWebsiteOwner,
  createRequireStoreAccess,
  requireStoreAccess,
};
