// factories/StrategyFactory.js
const {
  EcommerceStrategy,
  FashionStrategy,
  SkincareStrategy,
  RestaurantStrategy,
  CafeStrategy
} = require('../strategies/NicheStrategy');

class StrategyFactory {
  static createStrategy(niche) {
    const strategyMap = {
      'ecommerce': EcommerceStrategy,
      'fashion': FashionStrategy,
      'skincare': SkincareStrategy,
      'restaurant': RestaurantStrategy,
      'cafe': CafeStrategy
    };

    const StrategyClass = strategyMap[niche] || EcommerceStrategy;
    return new StrategyClass(niche);
  }

  static getSupportedNiches() {
    return ['ecommerce', 'fashion', 'skincare', 'restaurant', 'cafe'];
  }

  static validateNiche(niche) {
    return this.getSupportedNiches().includes(niche);
  }
}

module.exports = StrategyFactory;