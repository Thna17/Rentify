class FashionStrategy extends NicheStrategy {
  validateProduct(productData) {
    const errors = [];
    
    if (!productData.nicheAttributes?.fabric) {
      errors.push('Fabric information is required for fashion products');
    }

    return errors;
  }

  validateOptions(options) {
    const errors = [];
    const maxOptions = 5;

    if (options.length > maxOptions) {
      errors.push(`Maximum ${maxOptions} options allowed for fashion products`);
    }

    const hasSize = options.some(opt => opt.name.toLowerCase() === 'size');
    if (!hasSize) {
      errors.push('Fashion products must include a Size option');
    }

    const allowedTypes = ['select', 'color', 'image', 'size'];
    const invalidTypes = options.filter(opt => !allowedTypes.includes(opt.type));
    if (invalidTypes.length > 0) {
      errors.push(`Invalid option types: ${invalidTypes.map(opt => opt.type).join(', ')}`);
    }

    return errors;
  }

  generateDefaultAttributes() {
    return {
      sizeGuide: null,
      fabric: null,
      careInstructions: null,
      origin: null,
      season: null
    };
  }

  getRecommendedOptions(productType) {
    const options = [
      {
        name: 'Size',
        type: 'size',
        values: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map(size => ({ label: size, value: size })),
        required: true,
        recommended: true
      },
      {
        name: 'Color',
        type: 'color',
        values: [],
        recommended: true
      }
    ];

    if (productType === 'shoes') {
      options.push({
        name: 'Width',
        type: 'select',
        values: ['Narrow', 'Standard', 'Wide', 'Extra Wide'].map(width => ({ label: width, value: width })),
        recommended: true
      });
    }

    return options;
  }
}

module.exports = {
  FashionStrategy
};