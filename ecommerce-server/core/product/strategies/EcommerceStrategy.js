class EcommerceStrategy extends NicheStrategy {
  validateProduct(productData) {
    const errors = [];
    
    if (!productData.price || productData.price <= 0) {
      errors.push('Price must be greater than 0');
    }

    if (productData.trackInventory && productData.stockQuantity < 0) {
      errors.push('Stock quantity cannot be negative');
    }

    return errors;
  }

  validateOptions(options) {
    const errors = [];
    const maxOptions = 10;

    if (options.length > maxOptions) {
      errors.push(`Maximum ${maxOptions} options allowed for ecommerce products`);
    }

    const allowedTypes = ['select', 'color', 'image', 'text', 'size'];
    const invalidTypes = options.filter(opt => !allowedTypes.includes(opt.type));
    if (invalidTypes.length > 0) {
      errors.push(`Invalid option types: ${invalidTypes.map(opt => opt.type).join(', ')}`);
    }

    return errors;
  }

  generateDefaultAttributes() {
    return {
      warranty: null,
      specifications: {},
      compatibility: []
    };
  }

  getRecommendedOptions(productType) {
    const baseOptions = [
      {
        name: 'Color',
        type: 'color',
        values: [],
        recommended: true
      },
      {
        name: 'Size',
        type: 'size',
        values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(size => ({ label: size, value: size })),
        recommended: true
      }
    ];

    return baseOptions;
  }
}

module.exports = {
  EcommerceStrategy
};