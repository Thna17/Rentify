// orderRetrieval/strategies/BaseRetrievalStrategy.js
class BaseRetrievalStrategy {
  constructor(models = null) {
    this.models = models || require('../../../../../models');
    if (this.models.OrderItem) {
      this.includeCommon = [
        {
          model: this.models.OrderItem,
          as: "OrderItems",
          include: this.models.Product ? [this.models.Product] : []
        },
        {
          model: this.models.Payment,
          as: "Payment"
        },
        {
          model: this.models.ShippingDetail,
          as: 'ShippingDetail'
        }
      ];
    } else {
      this.includeCommon = [];
    }
  }

  async execute(req, res) {
    throw new Error('execute() must be implemented by subclasses');
  }

  handleError(res, error, defaultMessage = 'An error occurred') {
    console.error(error);
    res.status(500).json({ error: error.message || defaultMessage });
  }
}

module.exports = BaseRetrievalStrategy;