// orderRetrieval/strategies/MyOrderPaymentStrategy.js
const BaseRetrievalStrategy = require('./BaseRetrievalStrategy');

class MyOrderPaymentStrategy extends BaseRetrievalStrategy {
  async execute(req, res) {
    try {
      const { orderId } = req.params;
      const user = req.user;

      if (!user) return res.status(401).json({ error: 'Identification required' });

      let orderWhere;
      if (user.type === 'customer' && user.id) {
        orderWhere = { userId: user.id, id: orderId };
      } else if (user.type === 'user' && user.id) {
        orderWhere = { buyerId: user.id, id: orderId };
      } else if (user.sessionId) {
        orderWhere = { sessionId: user.sessionId, id: orderId };
      } else {
        return res.status(401).json({ error: 'Identification required' });
      }

      const payment = await this.models.Payment.findOne({
        where: { orderId },
        include: [{
          model: this.models.Order,
          where: orderWhere,
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