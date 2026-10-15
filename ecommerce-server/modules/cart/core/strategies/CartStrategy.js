// strategies/CartStrategy.js
class CartStrategy {
  constructor(niche) {
    this.niche = niche;
    this.config = this.getDefaultConfig();
  }

  getDefaultConfig() {
    return {
      maxQuantity: 99,
      allowCustomizations: false,
      taxRate: 0.08,
      validCustomizations: [],
      requiresPreparationTime: false,
      sizeValidation: false
    };
  }

  // Validation methods
  validateQuantity(quantity) {
    if (quantity > this.config.maxQuantity) {
      throw new Error(`Maximum quantity is ${this.config.maxQuantity}`);
    }
  }

  validateCustomizations(customizations) {
    if (Object.keys(customizations).length > 0 && !this.config.allowCustomizations) {
      throw new Error('Customizations are not allowed for this business type');
    }

    const invalidCustomizations = Object.keys(customizations).filter(
      key => !this.config.validCustomizations.includes(key)
    );
    
    if (invalidCustomizations.length > 0) {
      throw new Error(`Invalid customizations: ${invalidCustomizations.join(', ')}`);
    }
  }

  validateOptions(selectedOptions, product) {
    // Base validation - override in subclasses
    return true;
  }

  // Price calculation
  calculateItemPrice(product, variant, selectedOptions = {}, customizations = {}) {
    const basePrice = variant?.price || product.price;
    return this.applyCustomizationPricing(basePrice, customizations);
  }

  applyCustomizationPricing(basePrice, customizations) {
    // Base implementation - override in subclasses
    return basePrice;
  }

  // Tax calculation
  calculateTax(subtotal, productType) {
    return subtotal * this.config.taxRate;
  }

  // Shipping calculation
  calculateShipping(cartItems) {
    // Base shipping logic
    let shipping = 0;
    
    cartItems.forEach(item => {
      if (item.Product.productType === 'physical') {
        shipping += 2.99;
      }
    });

    // Free shipping threshold
    if (this.getSubtotal(cartItems) > 50) {
      shipping = 0;
    }

    return shipping;
  }

  // Utility methods
  getSubtotal(cartItems) {
    return cartItems.reduce((total, item) => {
      return total + (item.unitPrice * item.quantity);
    }, 0);
  }

  // Abstract methods to be implemented by subclasses
  validateProductSpecific(product, variant, customizations) {
    throw new Error('validateProductSpecific must be implemented');
  }

  getCartMetadata() {
    throw new Error('getCartMetadata must be implemented');
  }
}

module.exports = CartStrategy;