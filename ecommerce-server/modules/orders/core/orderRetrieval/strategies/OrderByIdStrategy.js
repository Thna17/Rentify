const { normalizePaymentMethod, normalizePaymentStatus } = require('../../../../payments/paymentUtils');
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

      // Reject cross-store / cross-website order access
      if (req.store && order.storeId && order.storeId !== req.store.storeId) {
        return res.status(404).json({ error: 'Order not found' });
      }
      if (req.website && order.websiteId && order.websiteId !== req.website.websiteId) {
        return res.status(404).json({ error: 'Order not found' });
      }

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
        paymentMethod: normalizePaymentMethod(order.Payment?.paymentMethod),
        paymentStatus: normalizePaymentStatus(order.Payment?.status),
        payment: order.Payment ? {
          id: order.Payment.id,
          amount: order.Payment.amount,
          status: normalizePaymentStatus(order.Payment.status),
          paymentMethod: normalizePaymentMethod(order.Payment.paymentMethod),
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