// strategies/RestaurantOrderStrategy.js
const OrderStrategy = require('./OrderStrategy');

class RestaurantOrderStrategy extends OrderStrategy {
  constructor() {
    super('restaurant');
    this.config = {
      taxRate: 0.05,
      requiresPreparation: true,
      supportsDelivery: true,
      supportsPickup: true,
      maxPreparationTime: 45,
      preparationTimePerItem: 5 // minutes per item
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

  calculateShippingFee(items, shippingInfo) {
    if (shippingInfo.deliveryType === 'delivery') {
      return 2.99; // Flat delivery fee for restaurants
    }
    return 0; // Pickup is free
  }

  async createOrderRecord(orderData, transaction = null) {
    const order = await super.createOrderRecord(orderData, transaction);
    
    // Calculate preparation time for restaurant orders
    const preparationTime = this.calculatePreparationTime(orderData.items);
    await order.update({ 
      preparationTime,
      estimatedDelivery: new Date(Date.now() + preparationTime * 60000),
      nicheMetadata: {
        tableNumber: orderData.tableNumber,
        orderType: orderData.deliveryType, // 'dine_in', 'delivery', 'pickup'
        specialInstructions: orderData.specialInstructions
      }
    }, { transaction });

    return order;
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

  getOrderMetadata() {
    return {
      type: 'restaurant',
      requiresPreparation: true,
      supportsDineIn: true,
      supportsDelivery: true,
      supportsPickup: true,
      canModifyOrder: true,
      preparationTimeEstimate: true
    };
  }
}

module.exports = RestaurantOrderStrategy;