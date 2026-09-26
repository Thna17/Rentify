const { PAYMENT_METHODS, PAYMENT_STATUS } = require("../../../../utils/constants");
const PaymentStrategy = require("./PaymentStrategy");

class ImmediatePaymentStrategy extends PaymentStrategy {
  async process(order, merchantConfig, transaction, currency) { 
    
    return this.models.Payment.create(
      {
        orderId: order.id,
        amount: order.totalAmount,
        paymentMethod: PAYMENT_METHODS.CASH,
        status: PAYMENT_STATUS.COMPLETED,
        transactionData: {
          posData: {
            terminalId: "POS_TERMINAL_1",
            timestamp: new Date(),
          },
        },
        currency: currency || 'USD',
      },
      { transaction }
    );
  }
}

module.exports = ImmediatePaymentStrategy;