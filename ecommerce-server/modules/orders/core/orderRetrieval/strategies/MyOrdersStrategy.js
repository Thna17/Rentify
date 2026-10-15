// orderRetrieval/strategies/MyOrdersStrategy.js
const BaseRetrievalStrategy = require('./BaseRetrievalStrategy');

class MyOrdersStrategy extends BaseRetrievalStrategy {
  async execute(req, res) {
    try {
      const { websiteId } = req.params;
      const { page = 1, limit = 10, status } = req.query;
      const user = req.user;

      const where = { websiteId };
      if (user.type === 'customer') where.userId = user.id;
      else where.sessionId = user.sessionId;
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
        paymentMethod: order.Payment?.paymentMethod,
        paymentStatus: order.Payment?.status
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