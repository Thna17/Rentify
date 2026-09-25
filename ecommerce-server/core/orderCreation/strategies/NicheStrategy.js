// strategies/NicheStrategy.js
const { ApiError } = require("../../../utils/ApiError");

class NicheStrategy {
  constructor(niche) {
    this.niche = niche;
    this.config = this.getDefaultConfig();
  }

  getDefaultConfig() {
    return {
      taxRate: 0.08,
      requiresPreparation: false,
      supportsDelivery: true,
      supportsPickup: true,
      maxPreparationTime: 60,
      autoFulfillDigital: false
    };
  }

  // Product validation for this niche
  async validateProduct(product, variant, itemData, transaction = null) {
    // Base validation - override in subclasses
    if (!product) {
      throw new Error(`Product not found: ${itemData.productId}`);
    }

    if (product.status !== 'active') {
      throw new Error(`Product ${product.name} is not active`);
    }

    // Validate variant if specified
    if (itemData.variantId && variant) {
      this.validateVariantOptions(itemData.selectedOptions, variant.optionValues);
    }

    // Validate stock
    const qty = Number(itemData.quantity) || 1;
    if (itemData.variantId && variant) {
      if (variant.trackInventory && variant.stockQuantity < qty) {
        throw new Error(`Insufficient stock for ${product.name}: only ${variant.stockQuantity} available`);
      }
    } else if (product.trackInventory && product.stockQuantity < qty) {
      throw new Error(`Insufficient stock for ${product.name}: only ${product.stockQuantity} available`);
    }

    // Validate customizations
    this.validateCustomizations(itemData.customizations);

    // Niche-specific validation
    await this.validateNicheSpecific(product, variant, itemData, transaction);
  }

  validateVariantOptions(selectedOptions, variantOptions) {
    if (selectedOptions && typeof selectedOptions === 'object') {
      for (const [key, value] of Object.entries(selectedOptions)) {
        if (variantOptions[key] !== value) {
          throw new Error(`Selected option ${key}=${value} does not match variant`);
        }
      }
    }
  }

  validateCustomizations(customizations) {
    if (customizations && typeof customizations !== 'object') {
      throw new Error('Customizations must be an object');
    }
  }

  async validateNicheSpecific(product, variant, itemData, transaction) {
    // Override in subclasses
  }

  // Price calculation for this niche
  calculateItemPrice(product, variant, selectedOptions = {}, customizations = {}) {
    const basePrice = variant?.price || product.price;
    return this.applyCustomizationPricing(basePrice, customizations);
  }

  applyCustomizationPricing(basePrice, customizations) {
    // Base implementation - override in subclasses
    return basePrice;
  }

  // Order totals calculation for this niche
  calculateOrderTotals(items, orderType, shippingInfo = {}, currency = 'USD') {
    let subtotal = 0;
    let taxTotal = 0;
    let discountTotal = 0;

    // Calculate item totals
    for (const item of items) {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;
      
      // Calculate tax per item
      const itemTax = this.calculateItemTax(itemTotal, item.productType);
      taxTotal += itemTax;
    }

    // Calculate shipping
    const shippingFee = this.calculateShippingFee(items, orderType, shippingInfo);

    // Apply discounts
    const totalAmount = subtotal + taxTotal + shippingFee - discountTotal;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxTotal: Math.round(taxTotal * 100) / 100,
      discountTotal: Math.round(discountTotal * 100) / 100,
      shippingFee: Math.round(shippingFee * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100
    };
  }

  calculateItemTax(itemTotal, productType) {
    const taxRates = {
      digital: 0.10,
      physical: 0.08,
      service: 0.08,
      food: 0.05,
      beverage: 0.05
    };
    
    return itemTotal * (taxRates[productType] || this.config.taxRate);
  }

  calculateShippingFee(items, orderType, shippingInfo) {
    // Base shipping logic - override in subclasses
    let shipping = 0;
    
    items.forEach(item => {
      if (item.productType === 'physical') {
        shipping += 2.99;
      }
    });

    // Free shipping threshold
    if (this.getItemsSubtotal(items) > 50) {
      shipping = 0;
    }

    return shipping;
  }

  getItemsSubtotal(items) {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  // Inventory management for this niche
  async updateInventory(items, transaction = null) {
    for (const item of [...items].sort((a, b) => a.productId.localeCompare(b.productId))) {
      await this.updateItemInventory(item, transaction);
    }
  }

  async updateItemInventory(item, transaction = null) {
    const { changeStock } = require('../../../services/sharedStockService');
    await changeStock(item.productId, -item.quantity, transaction, item.variantId || null);
  }

  // Order metadata for this niche
  getOrderMetadata(orderType) {
    return {
      niche: this.niche,
      type: orderType,
      requiresPreparation: this.config.requiresPreparation,
      supportsDelivery: this.config.supportsDelivery,
      supportsPickup: this.config.supportsPickup
    };
  }

  getItemMetadata(item, product, variant) {
    return {
      productType: product.productType,
      websiteNiche: product.websiteNiche,
      hasVariants: !!variant,
      variantOptions: variant?.optionValues || {}
    };
  }

  // Niche-specific processing
  async processNicheSpecific(order, items, transaction) {
    // Override in subclasses
  }
}

module.exports = NicheStrategy;
