class PaymentStrategy {
  constructor(models, paymentMethod = null) {
    this.models = models;
    this.paymentMethod = paymentMethod;
  }

  async process(order, merchantConfig, transaction, currency) {
    throw new Error('process() must be implemented by subclasses');
  }
}

module.exports = PaymentStrategy;