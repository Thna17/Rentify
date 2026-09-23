// orderRetrieval/strategies/OrderByIdStrategy.js
const BaseRetrievalStrategy = require('./BaseRetrievalStrategy');

class OrderByIdStrategy extends BaseRetrievalStrategy {
  async execute(req, res) {
    try {
      const { orderId } = req.params;
      const order = await this.models.Order.findByPk(orderId, {
        include: [...this.includeCommon, {model: this.models.Invoice, as: 'Invoice'}]
      });

      if (!order) return res.status(404).json({ error: 'Order not found' });

      res.json({
        id: order.id,
        websiteId: order.websiteId,
        totalAmount: order.totalAmount,
        status: order.status,
        currency: order.currency,
        orderNumber: order.orderNumber,
        OrderItems: order.OrderItems.map(item => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price,
          Product: item.Product
        })),
        shippingDetail: order.ShippingDetail,
        payment: order.Payment ? {
          id: order.Payment.id,
          amount: order.Payment.amount,
          status: order.Payment.status,
          paymentMethod: order.Payment.paymentMethod,
          qrCodeUrl: order.Payment.transactionData?.qrCodeUrl,
          rawQR: order.Payment.transactionData?.rawQR
        } : null,
        invoice: order.Invoice
      });
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch order details');
    }
  }
}

module.exports = OrderByIdStrategy;