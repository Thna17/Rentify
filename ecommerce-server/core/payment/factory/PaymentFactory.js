const KHQRPaymentStrategy = require("../strategies/KHQRPaymentStrategy");
const CODPaymentStrategy = require("../strategies/CODPaymentStrategy");
const ImmediatePaymentStrategy = require("../strategies/ImmediatePaymentStrategy");
const { PAYMENT_METHODS } = require("../../../utils/constants");

class PaymentFactory {
  static createStrategy(paymentMethod, models) {
    const raw = String(paymentMethod || '').trim().toLowerCase();

    let StrategyClass;
    if (raw === 'khqr' || raw === 'wallet' || raw === 'bakong') {
      StrategyClass = KHQRPaymentStrategy;
    } else if (raw === 'cod') {
      StrategyClass = CODPaymentStrategy;
    } else if (raw === 'cash' || raw === 'card' || raw === 'credit_card' || raw === 'debit_card') {
      StrategyClass = ImmediatePaymentStrategy;
    } else {
      const strategies = {
        [PAYMENT_METHODS.KHQR]: KHQRPaymentStrategy,
        [PAYMENT_METHODS.COD]: CODPaymentStrategy,
        [PAYMENT_METHODS.CASH]: ImmediatePaymentStrategy,
        [PAYMENT_METHODS.CARD]: ImmediatePaymentStrategy,
      };
      StrategyClass = strategies[paymentMethod];
    }

    if (!StrategyClass) {
      throw new Error(`Unsupported payment method: ${paymentMethod}`);
    }

    return new StrategyClass(models, paymentMethod);
  }
}

module.exports = PaymentFactory;
