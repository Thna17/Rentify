// factories/OrderTypeFactory.js
const OnlineOrderStrategy = require("../strategies/OnlineOrderStrategy");
const InvoiceOrderStrategy = require("../strategies/InvoiceOrderStrategy");
const POSOrderStrategy = require("../strategies/POSOrderStrategy");
const NicheStrategy = require("../strategies/NicheStrategy");

class OrderTypeFactory {
  static createStrategy(
    orderType,
    models,
    paymentProcessor,
    notificationService,
    websiteNiche,
  ) {
    // First create the niche strategy
    const nicheStrategy = new NicheStrategy(websiteNiche);

    const strategies = {
      online: OnlineOrderStrategy,
      invoice: InvoiceOrderStrategy,
      pos: POSOrderStrategy,
    };

    const StrategyClass = strategies[orderType];
    if (!StrategyClass) {
      throw new Error(`Invalid order type: ${orderType}`);
    }

    return new StrategyClass(
      models,
      paymentProcessor,
      notificationService,
      nicheStrategy
    );
  }

  static getSupportedOrderTypes() {
    return ["online", "invoice", "pos"];
  }
}

module.exports = OrderTypeFactory;
