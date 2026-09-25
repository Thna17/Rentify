const { Op } = require('sequelize');
const { Product, Order, OrderItem, Payment, ProductReview, OrderEvent,
  BillingStatement } = require('../models');

const scope = (req) => req.query.storeId ? { storeId: req.query.storeId } : {};
const resources = {
  products: { model: Product, search: ['name', 'slug', 'marketplaceCategory'],
    attributes: ['id', 'name', 'slug', 'storeId', 'websiteId', 'marketplaceCategory',
      'marketplaceVisibility', 'status', 'price', 'stockQuantity', 'createdAt'],
    where: scope },
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
      'isVerifiedPurchase', 'status', 'createdAt'], where: scope },
  reports: { model: OrderEvent, search: ['type'],
    attributes: ['id', 'orderId', 'storeId', 'actorId', 'type', 'details', 'createdAt'],
    where: (req) => ({ ...scope(req), type: { [Op.in]: ['complaint', 'return_requested'] } }) },
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
  const where = { ...(config.where?.(req) || {}) };
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
