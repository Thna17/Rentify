// strategies/RestaurantCartStrategy.js
const CartStrategy = require('./CartStrategy');

class RestaurantCartStrategy extends CartStrategy {
  constructor() {
    super('restaurant');
    this.config = {
      maxQuantity: 20,
      allowCustomizations: true,
      taxRate: 0.05,
      requiresPreparationTime: true,
      validCustomizations: ['spiceLevel', 'allergies', 'cookingPreferences', 'sideDishes']
    };
  }

  validateProductSpecific(product, variant, customizations) {
    // Validate spice level
    if (customizations.spiceLevel) {
      const validSpiceLevels = ['mild', 'medium', 'hot', 'extra-hot'];
      if (!validSpiceLevels.includes(customizations.spiceLevel.toLowerCase())) {
        throw new Error('Invalid spice level');
      }
    }

    // Validate preparation time for large orders
    if (this.config.requiresPreparationTime && customizations.rushOrder) {
      // Additional validation for rush orders
    }
  }

  applyCustomizationPricing(basePrice, customizations) {
    let finalPrice = basePrice;
    
    // Add pricing for premium customizations
    if (customizations.premiumSide) {
      finalPrice += 2.99;
    }
    
    if (customizations.extraSauce) {
      finalPrice += 0.99;
    }

    return finalPrice;
  }

  getCartMetadata() {
    return {
      type: 'restaurant',
      requiresPreparationTime: true,
      canAddSpecialInstructions: true,
      estimatedPreparationTime: 30 // minutes
    };
  }
}

module.exports = RestaurantCartStrategy;