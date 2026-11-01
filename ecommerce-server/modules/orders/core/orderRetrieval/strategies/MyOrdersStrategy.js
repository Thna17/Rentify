const { normalizePaymentMethod, normalizePaymentStatus } = require('../../../../payments/paymentUtils');
// orderRetrieval/strategies/MyOrdersStrategy.js
const BaseRetrievalStrategy = require('./BaseRetrievalStrategy');

class MyOrdersStrategy extends BaseRetrievalStrategy {
  async execute(req, res) {
    try {
      const { websiteId } = req.params;
      const { page = 1, limit = 10, status } = req.query;
      const user = req.user;

      if (!user) return res.status(401).json({ error: 'Identification required' });

      const where = { websiteId };
      if (user.type === 'customer' && user.id) {
        where.userId = user.id;
      } else if (user.type === 'user' && user.id) {
        where.buyerId = user.id;
      } else if (user.sessionId) {
        where.sessionId = user.sessionId;
      } else {
        return res.status(401).json({ error: 'Identification required' });
      }
      if (status) where.status = status;

      const orders = await this.models.Order.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: (page - 1) * limit,
        include: this.includeCommon,
        order: [['createdAt', 'DESC']],
      });

      const formattedOrders = orders.rows.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        items: order.OrderItems.map(item => ({
          id: item.id,
          productId: item.productId,
          name: item.Product.name,
          quantity: item.quantity,
          price: item.price,
          image: item.Product.images?.[0]?.url
        })),
        paymentMethod: normalizePaymentMethod(order.Payment?.paymentMethod),
        paymentStatus: normalizePaymentStatus(order.Payment?.status)
      }));

      res.json({
        totalOrders: orders.count,
        totalPages: Math.ceil(orders.count / limit),
        currentPage: parseInt(page),
        orders: formattedOrders
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }
}

module.exports = MyOrdersStrategy;