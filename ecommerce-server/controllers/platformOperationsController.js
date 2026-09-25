const { Op } = require('sequelize');
const { Product, Order, OrderItem, Payment, ProductReview, OrderEvent,
  BillingStatement } = require('../models');
const { sequelize } = require('../config/db');

const scope = (req) => req.query.storeId ? { storeId: req.query.storeId } : {};
const resources = {
  products: { model: Product, search: ['name', 'slug', 'marketplaceCategory'],
    attributes: ['id', 'name', 'slug', 'storeId', 'websiteId', 'marketplaceCategory',
      'marketplaceVisibility', 'status', 'price', 'stockQuantity', 'createdAt'],
    where: (req) => {
      const cond = { ...scope(req) };
      if (req.query.status) cond.status = req.query.status;
      if (req.query.visibility === 'listed') cond.marketplaceVisibility = true;
      if (req.query.visibility === 'held') cond.marketplaceVisibility = false;
      if (req.query.visibility === 'default') cond.marketplaceVisibility = null;
      return cond;
    } },
  orders: { model: Order, search: ['orderNumber'],
    attributes: ['id', 'orderNumber', 'storeId', 'websiteId', 'buyerId',
      'salesChannel', 'deliveryStatus', 'status', 'orderType', 'totalAmount',
      'shippingFee', 'currency', 'createdAt'],
    where: (req) => ({ ...scope(req), ...(req.query.channel ? { salesChannel: req.query.channel } : {}) }),
    include: [{ model: OrderItem, as: 'OrderItems',
      attributes: ['id', 'name', 'quantity', 'total', 'currency'] },
    { model: Payment, as: 'Payment',
      attributes: ['id', 'paymentMethod', 'status', 'collectedAmount'] }] },
  payments: { model: Payment, search: ['transactionId', 'paymentMethod'],
    attributes: ['id', 'orderId', 'storeId', 'amount', 'currency', 'paymentMethod',
      'status', 'transactionId', 'collectedAmount', 'createdAt'], where: scope },
  reviews: { model: ProductReview, search: ['buyerName', 'comment'],
    attributes: ['id', 'productId', 'storeId', 'buyerName', 'rating', 'comment',
      'isVerifiedPurchase', 'status', 'createdAt'],
    where: (req) => ({ ...scope(req), ...(req.query.status ? { status: req.query.status } : {}) }) },
  reports: { model: OrderEvent, search: ['type'],
    attributes: ['id', 'orderId', 'storeId', 'actorId', 'type', 'details', 'createdAt'],
    where: (req) => {
      const cond = { ...scope(req), type: { [Op.in]: ['complaint', 'return_requested'] } };
      if (req.query.status === 'open') {
        cond[Op.or] = [
          sequelize.where(sequelize.fn('JSON_EXTRACT', sequelize.col('details'), '$.status'), null),
          sequelize.where(sequelize.fn('JSON_EXTRACT', sequelize.col('details'), '$.status'), 'open'),
          sequelize.where(sequelize.fn('JSON_EXTRACT', sequelize.col('details'), '$.status'), '"open"'),
        ];
      } else if (req.query.status) {
        cond[Op.or] = [
          sequelize.where(sequelize.fn('JSON_EXTRACT', sequelize.col('details'), '$.status'), req.query.status),
          sequelize.where(sequelize.fn('JSON_EXTRACT', sequelize.col('details'), '$.status'), `"${req.query.status}"`),
        ];
      }
      return cond;
    } },
  billing: { model: BillingStatement, search: ['month', 'status'],
    attributes: ['id', 'storeId', 'websiteId', 'month', 'currency',
      'totalAmount', 'status', 'createdAt'], where: scope },
};

exports.list = async (req, res) => {
  const config = resources[req.params.resource];
  if (!config) return res.status(404).json({ error: 'Unknown admin resource' });
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
  const q = String(req.query.q || '').trim().slice(0, 120);
  const where = typeof config.where === 'function' ? config.where(req) : { ...(config.where || {}) };
  if (q) where[Op.or] = config.search.map((field) => ({ [field]: { [Op.like]: `%${q}%` } }));
  const { rows, count } = await config.model.findAndCountAll({
    where, attributes: config.attributes, include: config.include || [],
    distinct: true, order: [['createdAt', 'DESC']], limit, offset: (page - 1) * limit,
  });
  res.json({ data: rows, total: count, page, limit });
};

exports.overview = async (_req, res) => {
  const [productCount, orderCount, marketplaceOrders, openMarketplaceOrders,
    flaggedReviews, buyerReports] = await Promise.all([
    Product.count(), Order.count(), Order.count({ where: { salesChannel: 'marketplace' } }),
    Order.count({ where: { salesChannel: 'marketplace',
      status: { [Op.in]: ['pending', 'confirmed', 'processing'] } } }),
    ProductReview.count({ where: { status: 'flagged' } }),
    OrderEvent.count({ where: { type: { [Op.in]: ['complaint', 'return_requested'] } } }),
  ]);
  res.json({ data: { productCount, orderCount, marketplaceOrders,
    openMarketplaceOrders, flaggedReviews, buyerReports } });
};

exports.updateProduct = async (req, res) => {
  const { id } = req.params;
  const { marketplaceVisibility, status, stockQuantity } = req.body;
  const product = await Product.findByPk(id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  const updates = {};
  if (marketplaceVisibility === null || typeof marketplaceVisibility === 'boolean') {
    updates.marketplaceVisibility = marketplaceVisibility;
  }
  if (status && ['active', 'draft', 'archived', 'out_of_stock', 'inactive', 'low_stock'].includes(status)) {
    updates.status = status;
  }
  if (typeof stockQuantity === 'number' && stockQuantity >= 0) {
    updates.stockQuantity = stockQuantity;
    if (updates.stockQuantity > 0 && product.status === 'out_of_stock') {
      updates.status = 'active';
    }
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid product updates provided' });
  }
  updates.version = (product.version || 0) + 1;
  await product.update(updates);
  res.json({ success: true, data: product });
};

exports.updateReview = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['published', 'hidden', 'flagged'].includes(status)) {
    return res.status(400).json({ error: 'Invalid review status. Must be published, hidden, or flagged.' });
  }
  const review = await ProductReview.findByPk(id);
  if (!review) return res.status(404).json({ error: 'Review not found' });
  await review.update({ status });
  res.json({ success: true, data: review });
};

exports.deleteReview = async (req, res) => {
  const { id } = req.params;
  const review = await ProductReview.findByPk(id);
  if (!review) return res.status(404).json({ error: 'Review not found' });
  await review.destroy();
  res.json({ success: true, message: 'Review deleted successfully' });
};

exports.updateReport = async (req, res) => {
  const { id } = req.params;
  const { status, resolutionNotes } = req.body;
  if (!['open', 'investigating', 'resolved', 'dismissed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid report status. Must be open, investigating, resolved, or dismissed.' });
  }
  const report = await OrderEvent.findOne({
    where: { id, type: { [Op.in]: ['complaint', 'return_requested'] } },
  });
  if (!report) return res.status(404).json({ error: 'Report not found' });
  const currentDetails = report.details || {};
  const updatedDetails = {
    ...currentDetails,
    status,
    resolutionNotes: typeof resolutionNotes === 'string' ? resolutionNotes.trim() : (currentDetails.resolutionNotes || ''),
    resolvedBy: req.user?.id || 'admin',
    resolvedAt: new Date().toISOString(),
  };
  await report.update({ details: updatedDetails });
  res.json({ success: true, data: report });
};
