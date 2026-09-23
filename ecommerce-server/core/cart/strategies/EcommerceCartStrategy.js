// strategies/EcommerceCartStrategy.js
const CartStrategy = require('./CartStrategy');

class EcommerceCartStrategy extends CartStrategy {
  constructor() {
    super('ecommerce');
    this.config = {
      maxQuantity: 99,
      allowCustomizations: true,
      taxRate: 0.08,
      validCustomizations: ['giftWrapping', 'engraving', 'specialInstructions', 'giftMessage'],
      sizeValidation: false,
      requiresPreparationTime: false
    };
  }

  validateProductSpecific(product, variant, customizations) {
    // Digital products can't have physical customizations
    if (product.productType === 'digital') {
      if (customizations.engraving || customizations.giftWrapping) {
        throw new Error('Physical customizations not available for digital products');
      }
    }

    // Service products validation
    if (product.productType === 'service') {
      if (customizations.scheduling && !this.isValidSchedule(customizations.scheduling)) {
        throw new Error('Invalid scheduling format');
      }
    }
  }

  applyCustomizationPricing(basePrice, customizations) {
    let finalPrice = basePrice;
    
    if (customizations.giftWrapping) {
      finalPrice += customizations.giftWrapping === 'premium' ? 7.99 : 4.99;
    }
    
    if (customizations.engraving) {
      finalPrice += customizations.engraving.length * 0.5; // $0.50 per character
    }

    if (customizations.expeditedShipping) {
      finalPrice += 12.99;
    }

    return finalPrice;
  }

  calculateTax(subtotal, productType) {
    const taxRates = {
      digital: 0.10,
      physical: 0.08,
      service: 0.08,
      subscription: 0.08
    };
    
    return subtotal * (taxRates[productType] || this.config.taxRate);
  }

  calculateShipping(cartItems) {
    let shipping = 0;
    let hasPhysicalProduct = false;

    cartItems.forEach(item => {
      if (item.Product.productType === 'physical') {
        hasPhysicalProduct = true;
        // Base shipping per item
        shipping += 2.99;
        
        // Additional for heavy items
        if (item.Product.nicheAttributes?.weight > 5) {
          shipping += 5.00;
        }
      }
    });

    // Free shipping over $50 for physical products
    if (hasPhysicalProduct && this.getSubtotal(cartItems) > 50) {
      shipping = 0;
    }

    return shipping;
  }

  isValidSchedule(schedule) {
    // Basic schedule validation
    return schedule.date && schedule.time && 
           new Date(schedule.date) > new Date() &&
           /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(schedule.time);
  }

  getCartMetadata() {
    return {
      type: 'ecommerce',
      supportsMultipleCurrencies: true,
      internationalShipping: true,
      giftOptions: true,
      digitalDelivery: true,
      serviceScheduling: true
    };
  }
}

module.exports = EcommerceCartStrategy;