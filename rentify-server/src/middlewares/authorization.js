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

const requireDeploymentOwner = async (req, res, next) => {
  if (!req.user?.id) return deny(res, 401, "Unauthorized");
  const { Website } = require("../models");
  const website = await Website.findOne({ where: { vercelDeploymentId: req.params.deploymentId } });
  if (!website) return deny(res, 404, "Deployment not found");
  if (req.user.role !== "admin" && website.userId !== req.user.id) {
    return deny(res, 403, "You do not have access to this deployment");
  }
  req.website = website;
  return next();
};

module.exports = {
  requireAdmin,
  requireWebsiteOwner,
  requireContentOwner,
  requireDeploymentOwner,
  createRequireAdmin,
  createRequireWebsiteOwner,
};
