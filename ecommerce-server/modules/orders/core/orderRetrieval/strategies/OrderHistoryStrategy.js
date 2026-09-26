// orderRetrieval/strategies/OrderHistoryStrategy.js
const BaseRetrievalStrategy = require('./BaseRetrievalStrategy');

class OrderHistoryStrategy extends BaseRetrievalStrategy {
  async execute(req, res) {
    try {
      const { websiteId } = req.params;
      const { status, page = 1, limit = 10 } = req.query;
      
      const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status filter' });
      }

      const where = { websiteId };
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
        status: order.status,
        paymentMethod: order.Payment?.paymentMethod,
        totalAmount: order.totalAmount,
        orderDate: order.createdAt,
        paymentStatus: order.Payment?.status,
        orderType: order.orderType,
        items: order.OrderItems,
        shippingDetails: order.shippingDetail
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

module.exports = OrderHistoryStrategy;