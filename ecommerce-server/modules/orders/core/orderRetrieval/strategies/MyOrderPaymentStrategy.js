// orderRetrieval/strategies/MyOrderPaymentStrategy.js
const BaseRetrievalStrategy = require('./BaseRetrievalStrategy');

class MyOrderPaymentStrategy extends BaseRetrievalStrategy {
  async execute(req, res) {
    try {
      const { orderId } = req.params;
      const user = req.user;

      const payment = await this.models.Payment.findOne({
        where: { orderId },
        include: [{
          model: this.models.Order,
          where: user.type === 'customer' 
            ? { userId: user.id, id: orderId } 
            : { sessionId: user.sessionId, id: orderId }
        }]
      });

      if (!payment) return res.status(404).json({ error: 'Payment not found' });

      const order = payment.Order;
      res.json({
        payment: {
          id: payment.id,
          status: payment.status,
          amount: payment.amount,
          method: payment.paymentMethod,
          transactionData: payment.transactionData,
          currency: payment.currency
        },
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          totalAmount: order.totalAmount,
          currency: order.currency,
          orderType: order.orderType
        }
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }
}

module.exports = MyOrderPaymentStrategy;