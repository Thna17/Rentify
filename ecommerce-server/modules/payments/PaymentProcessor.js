const PaymentFactory = require("./core/factory/PaymentFactory");

class PaymentProcessor {
  constructor(models) {
    this.models = models;
  }

  async process(order, paymentMethod, merchantConfig, transaction, currency) {
    const effectiveMethod =
      merchantConfig?.gateway === 'cutluy' && ['khqr', 'cutluy'].includes(String(paymentMethod).toLowerCase())
        ? 'cutluy'
        : paymentMethod;
    const strategy = PaymentFactory.createStrategy(effectiveMethod, this.models);
    return strategy.process(order, merchantConfig, transaction, currency);
  }
}

module.exports = PaymentProcessor;