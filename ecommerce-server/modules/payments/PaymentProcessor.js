const PaymentFactory = require("./core/factory/PaymentFactory");

class PaymentProcessor {
  constructor(models) {
    this.models = models;
  }

  async process(order, paymentMethod, merchantConfig, transaction, currency) {
    const strategy = PaymentFactory.createStrategy(paymentMethod, this.models);
    return strategy.process(order, merchantConfig, transaction, currency);
  }
}

module.exports = PaymentProcessor;