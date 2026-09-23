// strategies/EcommerceOrderStrategy.js
const OrderStrategy = require('./OrderStrategy');

class EcommerceOrderStrategy extends OrderStrategy {
  constructor() {
    super('ecommerce');
    this.config = {
      taxRate: 0.08,
      requiresPreparation: false,
      supportsDelivery: true,
      supportsPickup: true,
      maxPreparationTime: 0,
      autoFulfillDigital: true
    };
  }

  validateCustomizations(customizations) {
    super.validateCustomizations(customizations);

    if (customizations.engraving && customizations.engraving.length > 50) {
      throw new Error('Engraving text too long');
    }

    if (customizations.digitalDelivery && !customizations.email) {
      throw new Error('Email required for digital delivery');
    }
  }

  applyCustomizationPricing(basePrice, customizations) {
    let finalPrice = basePrice;
    
    if (customizations.giftWrapping) {
      finalPrice += 4.99;
    }
    
    if (customizations.engraving) {
      finalPrice += customizations.engraving.length * 0.5; // $0.50 per character
    }

    if (customizations.extendedWarranty) {
      finalPrice += 29.99;
    }

    return finalPrice;
  }

  calculateShippingFee(items, shippingInfo) {
    let shipping = 0;
    let hasPhysicalProduct = false;

    items.forEach(item => {
      if (item.productType === 'physical') {
        hasPhysicalProduct = true;
        shipping += 2.99; // Base shipping per item
        
        // Additional for heavy items
        if (item.weight > 5) {
          shipping += 5.00;
        }
      }
    });

    // Free shipping over $50 for physical products
    if (hasPhysicalProduct && this.getItemsSubtotal(items) > 50) {
      shipping = 0;
    }

    return shipping;
  }

  async processNicheSpecific(order, items, transaction) {
    // Auto-fulfill digital products
    for (const item of items) {
      if (item.productType === 'digital' && this.config.autoFulfillDigital) {
        await this.fulfillDigitalProduct(item, order, transaction);
      }
    }
  }

  async fulfillDigitalProduct(item, order, transaction) {
    const OrderItem = require('../models/OrderItem');
    
    await OrderItem.update(
      { 
        fulfilled: true,
        fulfilledQuantity: item.quantity,
        itemMetadata: { 
          ...item.itemMetadata,
          digitalFulfillment: {
            fulfilledAt: new Date(),
            downloadLink: this.generateDownloadLink(item, order),
            accessCode: this.generateAccessCode()
          }
        }
      },
      { where: { id: item.id }, transaction }
    );
  }

  generateDownloadLink(item, order) {
    return `/downloads/${order.orderNumber}/${item.sku}`;
  }

  generateAccessCode() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  getOrderMetadata() {
    return {
      type: 'ecommerce',
      requiresPreparation: false,
      supportsDelivery: true,
      supportsPickup: true,
      digitalDelivery: true,
      internationalShipping: true,
      returnPolicy: '30_days',
      warrantyOptions: true
    };
  }
}

module.exports = EcommerceOrderStrategy;