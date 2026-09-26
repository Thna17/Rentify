// factories/CartStrategyFactory.js
const EcommerceCartStrategy = require('../strategies/EcommerceCartStrategy');
const RestaurantCartStrategy = require('../strategies/RestaurantCartStrategy');
const FashionCartStrategy = require('../strategies/FashionCartStrategy');
const SkincareCartStrategy = require('../strategies/SkincareCartStrategy');
const CafeCartStrategy = require('../strategies/CafeCartStrategy');

class CartStrategyFactory {
  static createStrategy(niche) {
    const strategyMap = {
      'ecommerce': EcommerceCartStrategy,
      'restaurant': RestaurantCartStrategy,
      'fashion': FashionCartStrategy,
      'skincare': SkincareCartStrategy,
      'cafe': CafeCartStrategy
    };

    const StrategyClass = strategyMap[niche] || EcommerceCartStrategy;
    return new StrategyClass();
  }

  static getSupportedNiches() {
    return ['ecommerce', 'restaurant', 'fashion', 'skincare', 'cafe'];
  }
}

module.exports = CartStrategyFactory;