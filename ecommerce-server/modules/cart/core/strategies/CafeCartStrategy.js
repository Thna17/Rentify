// strategies/CafeCartStrategy.js
const CartStrategy = require('./CartStrategy');

class CafeCartStrategy extends CartStrategy {
  constructor() {
    super('cafe');
    this.config = {
      maxQuantity: 15,
      allowCustomizations: true,
      taxRate: 0.05,
      requiresPreparationTime: true,
      validCustomizations: [
        'milkType', 'sweetness', 'temperature', 'iceLevel', 
        'syrup', 'whippedCream', 'extraShot', 'specialInstructions'
      ]
    };
  }

  validateProductSpecific(product, variant, customizations) {
    // Temperature validation for beverages
    if (customizations.temperature) {
      const validTemperatures = ['hot', 'warm', 'cold', 'iced', 'blended'];
      if (!validTemperatures.includes(customizations.temperature)) {
        throw new Error('Invalid temperature selection');
      }
    }

    // Sweetness level validation
    if (customizations.sweetness) {
      const validSweetness = ['none', 'light', 'medium', 'sweet', 'extra-sweet'];
      if (!validSweetness.includes(customizations.sweetness)) {
        throw new Error('Invalid sweetness level');
      }
    }

    // Milk type validation
    if (customizations.milkType) {
      const validMilkTypes = ['whole', 'skim', 'almond', 'oat', 'soy', 'coconut', 'lactose-free'];
      if (!validMilkTypes.includes(customizations.milkType)) {
        throw new Error('Invalid milk type');
      }
    }

    // Ice level validation for cold drinks
    if (customizations.iceLevel && customizations.temperature !== 'hot') {
      const validIceLevels = ['none', 'light', 'regular', 'extra'];
      if (!validIceLevels.includes(customizations.iceLevel)) {
        throw new Error('Invalid ice level');
      }
    }
  }

  applyCustomizationPricing(basePrice, customizations) {
    let finalPrice = basePrice;
    
    // Milk alternatives may have upcharge
    if (['almond', 'oat', 'soy', 'coconut'].includes(customizations.milkType)) {
      finalPrice += 0.75;
    }
    
    if (customizations.extraShot) {
      finalPrice += customizations.extraShot * 1.00; // $1 per extra shot
    }
    
    if (customizations.syrup) {
      finalPrice += 0.50; // $0.50 per syrup pump
    }
    
    if (customizations.whippedCream) {
      finalPrice += 0.50;
    }

    return finalPrice;
  }

  calculateShipping(cartItems) {
    // Cafe items typically don't ship, but for merchandise
    let shipping = 0;
    
    cartItems.forEach(item => {
      if (item.Product.productType === 'merchandise') {
        shipping += 3.99;
      }
    });

    return shipping;
  }

  getCartMetadata() {
    return {
      type: 'cafe',
      requiresPreparationTime: true,
      canModifyIngredients: true,
      temperatureOptions: true,
      milkAlternatives: true,
      estimatedPreparationTime: 10, // minutes
      supportsPickup: true,
      supportsDelivery: true
    };
  }
}

module.exports = CafeCartStrategy;