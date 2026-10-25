// strategies/NicheStrategy.js
const { ApiError } = require("../../../../../utils/ApiError");

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
    const { parseMinor, formatDecimal } = require('../../../../../utils/money');
    let subtotalMinor = 0;

    // Calculate item totals using integer minor units (no floating-point math)
    for (const item of items) {
      const priceMinor = parseMinor(item.price || 0, currency);
      const qty = Number(item.quantity) || 1;
      subtotalMinor += priceMinor * qty;
    }

    // Release 1 Policy: Tax calculation is disabled at 0.00
    const taxTotalMinor = 0;
    const discountTotalMinor = 0;

    // Calculate shipping
    let shippingFeeMinor = 0;
    if (orderType !== 'pos' && orderType !== 'pickup') {
      const fee = this.calculateShippingFee(items, orderType, shippingInfo);
      shippingFeeMinor = parseMinor(fee, currency);
    }

    const totalAmountMinor = subtotalMinor + taxTotalMinor + shippingFeeMinor - discountTotalMinor;

    return {
      subtotal: subtotalMinor / 100,
      taxTotal: 0,
      discountTotal: 0,
      shippingFee: shippingFeeMinor / 100,
      totalAmount: totalAmountMinor / 100,
    };
  }

  calculateItemTax(itemTotal, productType) {
    // Release 1 Policy: Tax calculation is disabled at 0.00
    return 0;
  }

  calculateShippingFee(items, orderType, shippingInfo) {
    // POS in-person sales and in-store pickups never incur shipping fees
    if (orderType === 'pos' || orderType === 'pickup') {
      return 0;
    }

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
    const { changeStock } = require('../../../../inventory').sharedStockService;
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
