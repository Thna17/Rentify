class PaymentStrategy {
  constructor(models) {
    this.models = models;
  }

  async process(order, merchantConfig, transaction, currency) {
    throw new Error('process() must be implemented by subclasses');
  }
}

module.exports = PaymentStrategy;