const { PAYMENT_METHODS, PAYMENT_STATUS } = require("../../../../utils/constants");
const PaymentStrategy = require("./PaymentStrategy");

class CODPaymentStrategy extends PaymentStrategy {
  async process(order, merchantConfig, transaction, currency) { // Add merchantConfig parameter
    return this.models.Payment.create(
      {
        orderId: order.id,
        amount: order.totalAmount,
        paymentMethod: PAYMENT_METHODS.COD,
        status: PAYMENT_STATUS.PENDING,
        currency: currency || 'USD', // Now correctly receives currency
      },
      { transaction }
    );
  }
}

module.exports = CODPaymentStrategy;