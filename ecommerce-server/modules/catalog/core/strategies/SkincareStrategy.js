class SkincareStrategy extends NicheStrategy {
  validateProduct(productData) {
    const errors = [];
    
    if (!productData.nicheAttributes?.skinType || productData.nicheAttributes.skinType.length === 0) {
      errors.push('Skin type information is required for skincare products');
    }

    if (!productData.nicheAttributes?.ingredients || productData.nicheAttributes.ingredients.length === 0) {
      errors.push('Ingredients list is required for skincare products');
    }

    return errors;
  }

  validateOptions(options) {
    const errors = [];
    const maxOptions = 4;

    if (options.length > maxOptions) {
      errors.push(`Maximum ${maxOptions} options allowed for skincare products`);
    }

    const allowedTypes = ['select', 'radio'];
    const invalidTypes = options.filter(opt => !allowedTypes.includes(opt.type));
    if (invalidTypes.length > 0) {
      errors.push(`Invalid option types: ${invalidTypes.map(opt => opt.type).join(', ')}`);
    }

    return errors;
  }

  generateDefaultAttributes() {
    return {
      skinType: [],
      ingredients: [],
      usageInstructions: null,
      volume: null,
      spf: null,
      crueltyFree: false,
      vegan: false
    };
  }

  getRecommendedOptions(productType) {
    const options = [
      {
        name: 'Size',
        type: 'select',
        values: ['30ml', '50ml', '100ml', '200ml', '500ml'].map(size => ({ label: size, value: size })),
        recommended: true
      }
    ];

    if (productType === 'sunscreen') {
      options.push({
        name: 'SPF Level',
        type: 'select',
        values: ['SPF 15', 'SPF 30', 'SPF 50', 'SPF 50+'].map(spf => ({ label: spf, value: spf })),
        recommended: true
      });
    }

    return options;
  }
}

module.exports = {
  SkincareStrategy
};