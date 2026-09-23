// orderRetrieval/strategies/POSOrdersStrategy.js
const BaseRetrievalStrategy = require('./BaseRetrievalStrategy');

class POSOrdersStrategy extends BaseRetrievalStrategy {
  async execute(req, res) {
    try {
      const { websiteId } = req.params;
      const orders = await this.models.Order.findAll({
        where: { websiteId, orderType: 'pos' },
        include: this.includeCommon,
        order: [['createdAt', 'DESC']],
      });

      const formattedOrders = orders.map(order => ({
        id: order.id,
        status: order.status,
        paymentMethod: order.Payment?.paymentMethod,
        totalAmount: order.totalAmount,
        orderDate: order.createdAt,
        paymentStatus: order.Payment?.status,
        items: order.OrderItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          product: item.Product ? {
            id: item.Product.id,
            name: item.Product.name,
            price: item.Product.price,
            sku: item.Product.sku,
            image: item.Product.images?.[0]?.url
          } : null
        }))
      }));

      res.json({
        totalOrders: formattedOrders.length,
        orders: formattedOrders
      });
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch POS orders');
    }
  }
}

module.exports = POSOrdersStrategy;