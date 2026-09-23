// models/ProductOption.js
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

// Niche-specific option configurations
const NICHE_OPTION_CONFIGS = {
  restaurant: {
    allowedTypes: ['select', 'radio', 'checkbox'],
    maxOptions: 6,
    templates: {
      spice: { name: 'Spice Level', type: 'select', values: ['Mild', 'Medium', 'Hot', 'Extra Hot'] },
      sides: { name: 'Side Dishes', type: 'select', values: ['Rice', 'Fries', 'Salad', 'Bread'] },
      dietary: { name: 'Dietary Options', type: 'checkbox', values: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free'] }
    }
  },
  fashion: {
    allowedTypes: ['select', 'color', 'image', 'size'],
    maxOptions: 3,
    templates: {
      size: { name: 'Size', type: 'size', values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
      color: { name: 'Color', type: 'color', values: [] },
      style: { name: 'Style', type: 'select', values: [] }
    }
  },
  skincare: {
    allowedTypes: ['select', 'radio'],
    maxOptions: 4,
    templates: {
      size: { name: 'Size', type: 'select', values: ['30ml', '50ml', '100ml', '200ml'] },
      type: { name: 'Skin Type', type: 'select', values: ['Dry', 'Oily', 'Combination', 'Sensitive'] }
    }
  },
  cafe: {
    allowedTypes: ['select', 'radio'],
    maxOptions: 4,
    templates: {
      size: { name: 'Size', type: 'select', values: ['Small', 'Medium', 'Large'] },
      temperature: { name: 'Temperature', type: 'select', values: ['Hot', 'Cold', 'Iced'] },
      milk: { name: 'Milk Type', type: 'select', values: ['Whole', 'Skim', 'Almond', 'Oat', 'Soy'] }
    }
  }
};

const ProductOption = sequelize.define(
  "ProductOption",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "Products", key: "id" }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true, len: [1, 100] }
    },
    type: {
      type: DataTypes.ENUM('select', 'color', 'image', 'text', 'size', 'radio', 'checkbox'),
      defaultValue: 'select',
    },
    values: {
      type: DataTypes.JSON,
      defaultValue: [],
      validate: {
        isValidValues(value) {
          if (!Array.isArray(value)) {
            throw new Error('Values must be an array');
          }
          value.forEach(val => {
            if (typeof val !== 'object' || !val.value) {
              throw new Error('Each option value must have a value property');
            }
            // For color type, expect hex code
            if (this.type === 'color' && !val.hexCode) {
              throw new Error('Color options must include hexCode');
            }
            // For image type, expect image URL
            if (this.type === 'image' && !val.imageUrl) {
              throw new Error('Image options must include imageUrl');
            }
          });
        }
      }
    },
    required: { type: DataTypes.BOOLEAN, defaultValue: false },
    position: { type: DataTypes.INTEGER, defaultValue: 0 },
    // Niche-specific option metadata
    optionConfig: {
      type: DataTypes.JSON,
      defaultValue: {}
    }
  },
  {
    indexes: [
      { fields: ["productId"] },
      { fields: ["productId", "position"] },
    ]
  }
);

// Static methods for niche-specific options
ProductOption.getNicheConfig = function(niche) {
  return NICHE_OPTION_CONFIGS[niche] || NICHE_OPTION_CONFIGS.ecommerce;
};

ProductOption.generateTemplateOptions = function(niche, templateKey) {
  const config = NICHE_OPTION_CONFIGS[niche];
  if (!config || !config.templates || !config.templates[templateKey]) {
    return null;
  }
  return config.templates[templateKey];
};

module.exports = ProductOption;