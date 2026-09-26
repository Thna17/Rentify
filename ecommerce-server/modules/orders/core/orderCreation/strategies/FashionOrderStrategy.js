// strategies/FashionOrderStrategy.js
const OrderStrategy = require('./OrderStrategy');

class FashionOrderStrategy extends OrderStrategy {
  constructor() {
    super('fashion');
    this.config = {
      taxRate: 0.08,
      requiresPreparation: false,
      supportsDelivery: true,
      supportsPickup: true,
      maxPreparationTime: 0,
      autoFulfillDigital: false
    };
  }

  validateCustomizations(customizations) {
    super.validateCustomizations(customizations);

    if (customizations.giftWrapping && !['standard', 'premium'].includes(customizations.giftWrapping)) {
      throw new Error('Invalid gift wrapping option');
    }

    if (customizations.monogram && customizations.monogram.length > 3) {
      throw new Error('Monogram cannot exceed 3 characters');
    }
  }

  applyCustomizationPricing(basePrice, customizations) {
    let finalPrice = basePrice;
    
    if (customizations.giftWrapping) {
      finalPrice += customizations.giftWrapping === 'premium' ? 7.99 : 4.99;
    }
    
    if (customizations.monogram) {
      finalPrice += 9.99;
    }

    if (customizations.expressAlterations) {
      finalPrice += 15.00;
    }

    return finalPrice;
  }

  calculateShippingFee(items, shippingInfo) {
    let shipping = 0;
    
    items.forEach(item => {
      // Fashion items might have different shipping based on size/weight
      if (item.selectedOptions?.Size === 'XXL' || item.selectedOptions?.Size === 'XXXL') {
        shipping += 4.99; // Extra for large sizes
      } else {
        shipping += 3.99;
      }
    });

    // Free shipping over $100 for fashion
    if (this.getItemsSubtotal(items) > 100) {
      shipping = 0;
    }

    return shipping;
  }

  getOrderMetadata() {
    return {
      type: 'fashion',
      requiresPreparation: false,
      supportsDelivery: true,
      supportsPickup: true,
      giftWrappingAvailable: true,
      monogrammingAvailable: true,
      sizeExchanges: true,
      returnPolicy: '30_days'
    };
  }
}

module.exports = FashionOrderStrategy;