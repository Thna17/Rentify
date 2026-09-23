// strategies/RestaurantNicheStrategy.js
const NicheStrategy = require('./NicheStrategy');

class RestaurantNicheStrategy extends NicheStrategy {
  constructor() {
    super('restaurant');
    this.config = {
      taxRate: 0.05,
      requiresPreparation: true,
      supportsDelivery: true,
      supportsPickup: true,
      maxPreparationTime: 45,
      preparationTimePerItem: 5
    };
  }

  validateCustomizations(customizations) {
    super.validateCustomizations(customizations);

    if (customizations.spiceLevel) {
      const validSpiceLevels = ['mild', 'medium', 'hot', 'extra-hot'];
      if (!validSpiceLevels.includes(customizations.spiceLevel)) {
        throw new Error('Invalid spice level');
      }
    }

    if (customizations.allergies && !Array.isArray(customizations.allergies)) {
      throw new Error('Allergies must be an array');
    }
  }

  applyCustomizationPricing(basePrice, customizations) {
    let finalPrice = basePrice;
    
    if (customizations.extraPortion) {
      finalPrice += 3.99;
    }
    
    if (customizations.premiumSide) {
      finalPrice += 2.99;
    }

    return finalPrice;
  }

  calculateShippingFee(items, orderType, shippingInfo) {
    if (orderType === 'delivery') {
      return 2.99; // Flat delivery fee for restaurants
    }
    return 0; // Dine-in and pickup are free
  }

  getOrderMetadata(orderType) {
    const baseMetadata = super.getOrderMetadata(orderType);
    return {
      ...baseMetadata,
      preparationTimeEstimate: true,
      canModifyOrder: true,
      orderTypes: ['dine_in', 'delivery', 'pickup']
    };
  }

  async processNicheSpecific(order, items, transaction) {
    // Calculate preparation time for restaurant orders
    const preparationTime = this.calculatePreparationTime(items);
    await order.update({ 
      preparationTime,
      estimatedDelivery: new Date(Date.now() + preparationTime * 60000),
      nicheMetadata: {
        tableNumber: order.tableNumber,
        orderType: order.orderType,
        specialInstructions: order.specialInstructions
      }
    }, { transaction });
  }

  calculatePreparationTime(items) {
    let totalTime = 15; // Base preparation time
    
    items.forEach(item => {
      totalTime += item.quantity * this.config.preparationTimePerItem;
      
      // Additional time for complex items
      if (item.customizations?.spiceLevel === 'extra-hot') {
        totalTime += 3;
      }
    });

    return Math.min(totalTime, this.config.maxPreparationTime);
  }
}

module.exports = RestaurantNicheStrategy;