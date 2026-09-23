// strategies/EcommerceNicheStrategy.js
const NicheStrategy = require('./NicheStrategy');

class EcommerceNicheStrategy extends NicheStrategy {
  constructor() {
    super('ecommerce');
    this.config = {
      taxRate: 0.08,
      requiresPreparation: false,
      supportsDelivery: true,
      supportsPickup: true,
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
      finalPrice += customizations.engraving.length * 0.5;
    }

    if (customizations.extendedWarranty) {
      finalPrice += 29.99;
    }

    return finalPrice;
  }

  calculateShippingFee(items, orderType, shippingInfo) {
    let shipping = 0;
    let hasPhysicalProduct = false;

    items.forEach(item => {
      if (item.productType === 'physical') {
        hasPhysicalProduct = true;
        shipping += 2.99;
        
        if (item.weight > 5) {
          shipping += 5.00;
        }
      }
    });

    if (hasPhysicalProduct && this.getItemsSubtotal(items) > 50) {
      shipping = 0;
    }

    return shipping;
  }

  getOrderMetadata(orderType) {
    const baseMetadata = super.getOrderMetadata(orderType);
    return {
      ...baseMetadata,
      digitalDelivery: true,
      internationalShipping: true,
      returnPolicy: '30_days',
      warrantyOptions: true
    };
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
    const OrderItem = require('../../models/OrderItem');
    
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
}

module.exports = EcommerceNicheStrategy;