const { normalizePaymentMethod, normalizePaymentStatus } = require('../../../../payments/paymentUtils');
// orderRetrieval/strategies/MyOrderDetailsStrategy.js
const BaseRetrievalStrategy = require('./BaseRetrievalStrategy');

class MyOrderDetailsStrategy extends BaseRetrievalStrategy {
  async execute(req, res) {
    try {
      const { orderId } = req.params;

      // Public tracking endpoint mode: exposes only approved minimal safe fields (NO PII, NO address, NO secrets)
      if (req.query?.tracking === 'true' || req.query?.public === 'true') {
        const order = await this.models.Order.findByPk(orderId);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        return res.json({
          orderNumber: order.orderNumber,
          trackingNumber: order.trackingNumber || null,
          status: order.status,
          deliveryStatus: order.deliveryStatus,
          createdAt: order.createdAt,
          estimatedDelivery: order.estimatedDelivery || null,
        });
      }

      const user = req.user;

      if (!user) return res.status(401).json({ error: 'Identification required' });

      const where = { id: orderId };
      if (user.type === 'customer' && user.id) {
        where.userId = user.id;
      } else if (user.type === 'user' && user.id) {
        where.buyerId = user.id;
      } else if (user.sessionId) {
        where.sessionId = user.sessionId;
      } else {
        return res.status(401).json({ error: 'Identification required' });
      }

      const order = await this.models.Order.findOne({
        where,
        include: [...this.includeCommon, this.models.Invoice]
      });

      if (!order) return res.status(404).json({ error: 'Order not found' });

      // This is the customer/guest receipt endpoint. It intentionally returns
      // only the order that belongs to the current customer or browser session,
      // while keeping the response shape used by storefront confirmation pages.
      res.json({
        id: order.id,
        websiteId: order.websiteId,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.totalAmount,
        currency: order.currency,
        createdAt: order.createdAt,
        OrderItems: order.OrderItems.map((item) => ({
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          Product: {
            id: item.Product?.id || item.productId,
            name: item.Product?.name || item.name,
            sku: item.Product?.sku || item.sku,
            images: item.Product?.images || [],
          },
        })),
        shippingDetail: order.ShippingDetail,
        paymentMethod: normalizePaymentMethod(order.Payment?.paymentMethod),
        paymentStatus: normalizePaymentStatus(order.Payment?.status),
        payment: order.Payment
          ? {
              id: order.Payment.id,
              amount: order.Payment.amount,
              status: normalizePaymentStatus(order.Payment.status),
              paymentMethod: normalizePaymentMethod(order.Payment.paymentMethod),
              qrCodeUrl: order.Payment.transactionData?.qrCodeUrl,
              rawQR: order.Payment.transactionData?.rawQR,
            }
          : null,
        invoice: order.Invoice
          ? {
              number: order.Invoice.invoiceNumber,
              status: order.Invoice.status,
              pdfUrl: order.Invoice.pdfUrl,
            }
          : null,
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }
}

module.exports = MyOrderDetailsStrategy;
