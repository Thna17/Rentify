class CafeStrategy extends NicheStrategy {
  validateProduct(productData) {
    const errors = [];
    return errors;
  }

  validateOptions(options) {
    const errors = [];
    const maxOptions = 4;

    if (options.length > maxOptions) {
      errors.push(`Maximum ${maxOptions} options allowed for cafe products`);
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
      preparationTime: null,
      temperature: 'hot',
      size: 'regular',
      caffeineContent: null,
      dairyFree: false
    };
  }

  getRecommendedOptions(productType) {
    return [
      {
        name: 'Size',
        type: 'select',
        values: ['Small', 'Medium', 'Large'].map(size => ({ label: size, value: size })),
        required: true,
        recommended: true
      },
      {
        name: 'Temperature',
        type: 'select',
        values: ['Hot', 'Cold', 'Iced'].map(temp => ({ label: temp, value: temp })),
        recommended: true
      },
      {
        name: 'Milk Type',
        type: 'select',
        values: ['Whole', 'Skim', 'Almond', 'Oat', 'Soy', 'Coconut'].map(milk => ({ label: milk, value: milk })),
        recommended: true
      }
    ];
  }
}

module.exports = {
  CafeStrategy
};