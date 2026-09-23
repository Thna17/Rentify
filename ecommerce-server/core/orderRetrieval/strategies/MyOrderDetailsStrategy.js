// orderRetrieval/strategies/MyOrderDetailsStrategy.js
const BaseRetrievalStrategy = require('./BaseRetrievalStrategy');

class MyOrderDetailsStrategy extends BaseRetrievalStrategy {
  async execute(req, res) {
    try {
      const { orderId } = req.params;
      const user = req.user;

      const where = { id: orderId };
      if (user.type === 'customer') where.userId = user.id;
      else where.sessionId = user.sessionId;

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
        payment: order.Payment
          ? {
              id: order.Payment.id,
              amount: order.Payment.amount,
              status: order.Payment.status,
              paymentMethod: order.Payment.paymentMethod,
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
