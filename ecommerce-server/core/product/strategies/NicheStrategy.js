// strategies/NicheStrategy.js
class NicheStrategy {
  constructor(niche) {
    this.niche = niche;
  }

  validateProduct(productData) {
    throw new Error('validateProduct must be implemented');
  }

  validateOptions(options) {
    throw new Error('validateOptions must be implemented');
  }

  generateDefaultAttributes() {
    throw new Error('generateDefaultAttributes must be implemented');
  }

  getRecommendedOptions(productType) {
    throw new Error('getRecommendedOptions must be implemented');
  }
}

// strategies/EcommerceStrategy.js
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

// strategies/FashionStrategy.js
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

// strategies/SkincareStrategy.js
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

// strategies/RestaurantStrategy.js
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

// strategies/CafeStrategy.js
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
  NicheStrategy,
  EcommerceStrategy,
  FashionStrategy,
  SkincareStrategy,
  RestaurantStrategy,
  CafeStrategy
};