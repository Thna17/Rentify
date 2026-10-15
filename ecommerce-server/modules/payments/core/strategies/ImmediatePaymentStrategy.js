const { PAYMENT_METHODS, PAYMENT_STATUS } = require("../../../../utils/constants");
const PaymentStrategy = require("./PaymentStrategy");

class ImmediatePaymentStrategy extends PaymentStrategy {
  async process(order, merchantConfig, transaction, currency) {
    const raw = String(this.paymentMethod || '').toLowerCase();
    const isCard = raw.includes('card');
    const method = isCard ? PAYMENT_METHODS.CARD : PAYMENT_METHODS.CASH;

    return this.models.Payment.create(
      {
        orderId: order.id,
        amount: order.totalAmount,
        paymentMethod: method,
        status: PAYMENT_STATUS.COMPLETED,
        transactionData: {
          posData: {
            terminalId: "POS_TERMINAL_1",
            method: isCard ? "CARD" : "CASH",
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