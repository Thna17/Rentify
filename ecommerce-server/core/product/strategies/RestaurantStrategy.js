class RestaurantStrategy extends NicheStrategy {
  validateProduct(productData) {
    const errors = [];
    
    if (productData.productType === 'food' && !productData.nicheAttributes?.preparationTime) {
      errors.push('Preparation time is required for food items');
    }

    return errors;
  }

  validateOptions(options) {
    const errors = [];
    const maxOptions = 6;

    if (options.length > maxOptions) {
      errors.push(`Maximum ${maxOptions} options allowed for restaurant products`);
    }

    const allowedTypes = ['select', 'radio', 'checkbox'];
    const invalidTypes = options.filter(opt => !allowedTypes.includes(opt.type));
    if (invalidTypes.length > 0) {
      errors.push(`Invalid option types: ${invalidTypes.map(opt => opt.type).join(', ')}`);
    }

    return errors;
  }

  generateDefaultAttributes() {
    return {
      preparationTime: null,
      spiceLevel: null,
      dietaryInfo: [],
      ingredients: [],
      allergens: [],
      calories: null
    };
  }

  getRecommendedOptions(productType) {
    const options = [
      {
        name: 'Spice Level',
        type: 'select',
        values: ['Mild', 'Medium', 'Hot', 'Extra Hot'].map(level => ({ label: level, value: level })),
        recommended: true
      }
    ];

    if (productType === 'food') {
      options.push(
        {
          name: 'Side Dishes',
          type: 'checkbox',
          values: ['Rice', 'Fries', 'Salad', 'Bread', 'Vegetables'].map(side => ({ label: side, value: side })),
          recommended: true
        },
        {
          name: 'Dietary Options',
          type: 'checkbox',
          values: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free'].map(option => ({ label: option, value: option })),
          recommended: true
        }
      );
    }

    return options;
  }
}
module.exports = {
  RestaurantStrategy
};