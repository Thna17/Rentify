const KHQRPaymentStrategy = require("../strategies/KHQRPaymentStrategy");
const CODPaymentStrategy = require("../strategies/CODPaymentStrategy");
const ImmediatePaymentStrategy = require("../strategies/ImmediatePaymentStrategy");
const { PAYMENT_METHODS } = require("../../../../utils/constants");

class PaymentFactory {
  static createStrategy(paymentMethod, models) {
    const strategies = {
      [PAYMENT_METHODS.KHQR]: KHQRPaymentStrategy,
      [PAYMENT_METHODS.COD]: CODPaymentStrategy,
      [PAYMENT_METHODS.CASH]: ImmediatePaymentStrategy,
      [PAYMENT_METHODS.CARD]: ImmediatePaymentStrategy,
    };

    const StrategyClass = strategies[paymentMethod];
    if (!StrategyClass) {
      throw new Error(`Unsupported payment method: ${paymentMethod}`);
    }

    return new StrategyClass(models);
  }
}

module.exports = PaymentFactory;
