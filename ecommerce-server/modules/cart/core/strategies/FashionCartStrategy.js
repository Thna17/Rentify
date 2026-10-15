// strategies/FashionCartStrategy.js
const CartStrategy = require('./CartStrategy');

class FashionCartStrategy extends CartStrategy {
  constructor() {
    super('fashion');
    this.config = {
      maxQuantity: 10,
      allowCustomizations: true,
      taxRate: 0.08,
      sizeValidation: true,
      validCustomizations: ['giftWrapping', 'monogram', 'specialPackaging']
    };
  }

  validateProductSpecific(product, variant, customizations) {
    // Validate size selection
    if (variant?.optionValues?.Size) {
      const validSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
      if (!validSizes.includes(variant.optionValues.Size)) {
        throw new Error('Invalid size selected');
      }
    }

    // Validate monogram customizations
    if (customizations.monogram && customizations.monogram.length > 3) {
      throw new Error('Monogram cannot exceed 3 characters');
    }
  }

  applyCustomizationPricing(basePrice, customizations) {
    let finalPrice = basePrice;
    
    if (customizations.giftWrapping) {
      finalPrice += 4.99;
    }
    
    if (customizations.monogram) {
      finalPrice += 9.99;
    }

    return finalPrice;
  }

  getCartMetadata() {
    return {
      type: 'fashion',
      sizeGuideAvailable: true,
      canAddMonogram: true,
      giftWrappingAvailable: true
    };
  }
}

module.exports = FashionCartStrategy;