// orderRetrieval/OrderRetrievalFactory.js
const OrderHistoryStrategy = require('../strategies/OrderHistoryStrategy');
const OrderByIdStrategy = require('../strategies/OrderByIdStrategy');
const MyOrdersStrategy = require('../strategies/MyOrdersStrategy');
const MyOrderDetailsStrategy = require('../strategies/MyOrderDetailsStrategy');
const MyOrderPaymentStrategy = require('../strategies/MyOrderPaymentStrategy');
const POSOrdersStrategy = require('../strategies/POSOrdersStrategy');

class OrderRetrievalFactory {
  static createStrategy(type) {
    const strategies = {
      history: OrderHistoryStrategy,
      byId: OrderByIdStrategy,
      myOrders: MyOrdersStrategy,
      myOrderDetails: MyOrderDetailsStrategy,
      myOrderPayment: MyOrderPaymentStrategy,
      posOrders: POSOrdersStrategy
    };

    const Strategy = strategies[type];
    if (!Strategy) throw new Error(`Invalid retrieval type: ${type}`);
    return new Strategy();
  }
}

module.exports = OrderRetrievalFactory;
