const { Op } = require('sequelize');
const { Store, User, Website, WebsiteTemplate, Subscription, Package,
  SellerApplication, SellerReview, Payment } = require('../models');

const owner = { model: User, as: 'owner', attributes: ['id', 'name', 'email', 'phoneNumber', 'isVerified'] };
const website = { model: Website, as: 'website', attributes: ['id', 'name', 'domain', 'status'] };
const application = { model: SellerApplication, as: 'sellerApplication',
  attributes: ['responsibleName', 'pickupLocation', 'buyerContact', 'sampleProductDescription',
    'acceptsDeliveryResponsibility', 'acceptsCodResponsibility', 'acceptsReturnsResponsibility',
    'acceptsRefundResponsibility', 'status', 'reviewReason', 'submittedAt'] };

const resources = {
  stores: { model: Store, search: ['name', 'slug', 'primaryCategory'],
    attributes: ['id', 'ownerUserId', 'name', 'slug', 'primaryCategory', 'needsCategoryReview',
      'marketplaceEnabled', 'marketplaceApprovalStatus', 'marketplaceEntitlement',
      'status', 'createdAt'],
    include: (req) => [owner, website, { ...application,
      required: Boolean(req.query.applicationStatus),
      ...(req.query.applicationStatus ? { where: { status: req.query.applicationStatus } } : {}) }],
    where: (req) => req.query.status ? { marketplaceApprovalStatus: req.query.status } : {} },
  users: { model: User, search: ['name', 'email', 'phoneNumber'],
    attributes: ['id', 'name', 'email', 'phoneNumber', 'role', 'isVerified', 'createdAt'],
    include: () => [{ model: Store, as: 'store', attributes: ['id', 'name'] }] },
  websites: { model: Website, search: ['name', 'domain'],
    attributes: ['id', 'storeId', 'name', 'domain', 'status', 'templateId', 'lastDeployment', 'createdAt'] },
  templates: { model: WebsiteTemplate, search: ['name'],
    attributes: ['id', 'name', 'category', 'framework', 'createdAt'] },
  subscriptions: { model: Subscription, search: ['status'],
    attributes: ['id', 'userId', 'websiteId', 'packageId', 'status', 'startDate', 'endDate', 'createdAt'],
    include: () => [{ model: Package, attributes: ['id', 'name', 'price', 'duration'] }] },
  packages: { model: Package, search: ['name'],
    attributes: ['id', 'name', 'price', 'duration', 'features', 'limits', 'createdAt'] },
  'plan-payments': { model: Payment, search: ['status', 'transactionId'],
    attributes: ['id', 'userId', 'amount', 'currency', 'status', 'paymentMethod',
      'transactionId', 'createdAt'] },
  'seller-reviews': { model: SellerReview, search: ['decision'],
    attributes: ['id', 'storeId', 'reviewerUserId', 'decision', 'checklist', 'reason', 'createdAt'],
    where: (req) => req.query.storeId ? { storeId: req.query.storeId } : {} },
};

exports.list = async (req, res) => {
  const config = resources[req.params.resource];
  if (!config) return res.status(404).json({ error: 'Unknown admin resource' });
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
  const q = String(req.query.q || '').trim().slice(0, 120);
  const where = { ...(config.where?.(req) || {}) };
  if (q) where[Op.or] = config.search.map((field) => ({ [field]: { [Op.like]: `%${q}%` } }));
  const { rows, count } = await config.model.findAndCountAll({
    where, attributes: config.attributes, include: config.include?.(req) || [],
    distinct: true, order: [['createdAt', 'DESC']], limit, offset: (page - 1) * limit,
  });
  res.json({ data: rows, total: count, page, limit });
};

exports.overview = async (_req, res) => {
  const [storeCount, activeStores, pendingSellers, websiteCount, userCount,
    activeSubscriptions, pendingPlanPayments] = await Promise.all([
    Store.count(), Store.count({ where: { status: 'active' } }),
    SellerApplication.count({ where: { status: 'pending' } }),
    Website.count(), User.count(), Subscription.count({ where: { status: 'active' } }),
    Payment.count({ where: { status: 'pending' } }),
  ]);
  res.json({ data: { storeCount, activeStores, pendingSellers, websiteCount,
    userCount, activeSubscriptions, pendingPlanPayments } });
};
