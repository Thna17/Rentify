// models/Product.js
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

// Niche-specific product type mapping
const NICHE_PRODUCT_TYPES = {
  restaurant: ['food', 'beverage', 'combo', 'alcohol'],
  ecommerce: ['physical', 'digital', 'service', 'subscription'],
  cafe: ['beverage', 'food', 'combo', 'merchandise'],
  fashion: ['clothing', 'shoes', 'accessories', 'jewelry'],
  skincare: ['cleanser', 'moisturizer', 'treatment', 'mask', 'sunscreen'],
  grocery: ['fresh', 'packaged', 'frozen', 'beverage'],
  electronics: ['device', 'accessory', 'component', 'software']
};

const Product = sequelize.define(
  "Product",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255],
      },
    },
    description: DataTypes.TEXT,
    shortDescription: DataTypes.STRING(500),
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0.01 }
    },
    compareAtPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: { min: 0.01 }
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    images: {
      type: DataTypes.JSON,
      defaultValue: [],
      validate: {
        isValidImages(value) {
          if (!Array.isArray(value)) {
            throw new Error("Images must be an array");
          }
          value.forEach((img) => {
            if (typeof img !== "object" || !img.url) {
              throw new Error("Each image must have a URL");
            }
          });
        },
      },
    },
    websiteId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    storeId: { type: DataTypes.UUID, allowNull: true },
    // Dynamic product type based on niche
    productType: {
      type: DataTypes.STRING,
      defaultValue: "physical",
      validate: {
        isValidProductType(value) {
          // This will be validated in the hook based on website niche
        }
      }
    },
    // Store website niche for quick access
    websiteNiche: {
      type: DataTypes.ENUM('restaurant', 'ecommerce', 'cafe', 'blog', 'fashion', 'skincare', 'electronics', 'grocery'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('active', 'draft', 'archived', 'out_of_stock', 'inactive', 'low_stock'),
      defaultValue: "active",
    },
    // Niche-specific fields
    nicheAttributes: {
      type: DataTypes.JSON,
      defaultValue: {},
      validate: {
        isValidNicheAttributes(value) {
          if (value && typeof value !== 'object') {
            throw new Error('Niche attributes must be an object');
          }
        }
      }
    },
    // Common fields
    trackInventory: { type: DataTypes.BOOLEAN, defaultValue: true },
    stockQuantity: { type: DataTypes.INTEGER, defaultValue: 0, validate: { min: 0 } },
    lowStockThreshold: { type: DataTypes.INTEGER, defaultValue: 5 },
    allowBackorders: { type: DataTypes.BOOLEAN, defaultValue: false },

    // SEO
    seoTitle: DataTypes.STRING,
    seoDescription: DataTypes.TEXT,
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true }
    },

    tags: {
      type: DataTypes.JSON,
      defaultValue: [],
      get() {
        const rawValue = this.getDataValue("tags");
        return Array.isArray(rawValue) ? rawValue : [];
      },
      set(value) {
        this.setDataValue("tags", Array.isArray(value) ? value : []);
      },
    },
    version: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
  },
  {
    indexes: [
      { fields: ["websiteId"] },
      { fields: ["slug", "websiteId"], unique: true },
      { fields: ["websiteNiche"] },
      { fields: ["productType"] },
      { fields: ["websiteId", "status"] },
      { fields: ["websiteId", "categoryId"] },
      { fields: ["name", "description"], type: "FULLTEXT" },
    ],
    hooks: {
      beforeValidate: async (product) => {
        // Get website niche if not already set
        if (!product.websiteNiche && product.websiteId) {
          const WebsiteData = require('./WebsiteData');
          const website = await WebsiteData.findOne({
            where: { websiteId: product.websiteId },
            attributes: ['niche']
          });
          if (website) {
            product.websiteNiche = website.niche;
          }
        }

        // Validate product type based on niche
        if (product.websiteNiche && product.productType) {
          const allowedTypes = NICHE_PRODUCT_TYPES[product.websiteNiche] || ['physical'];
          if (!allowedTypes.includes(product.productType)) {
            throw new Error(`Product type '${product.productType}' is not allowed for niche '${product.websiteNiche}'. Allowed types: ${allowedTypes.join(', ')}`);
          }
        }

        // Generate slug
        if (!product.slug && product.name) {
          product.slug = product.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)+/g, "");
        }

        // Auto status based on inventory
        if (product.trackInventory) {
          if (product.stockQuantity <= 0 && !product.allowBackorders) {
            product.status = "out_of_stock";
          }
        }
      },

      beforeCreate: (product) => {
        // Set default niche attributes based on niche
        if (!product.nicheAttributes || Object.keys(product.nicheAttributes).length === 0) {
          product.nicheAttributes = getDefaultNicheAttributes(product.websiteNiche);
        }
      }
    }
  }
);

// Helper function for default niche attributes
function getDefaultNicheAttributes(niche) {
  const defaults = {
    restaurant: {
      preparationTime: null,
      spicyLevel: null,
      dietaryInfo: [],
      ingredients: []
    },
    fashion: {
      sizeGuide: null,
      fabric: null,
      careInstructions: null,
      origin: null
    },
    skincare: {
      skinType: [],
      ingredients: [],
      usageInstructions: null,
      volume: null
    },
    cafe: {
      preparationTime: null,
      temperature: 'hot',
      size: 'regular'
    },
    electronics: {
      warranty: null,
      specifications: {},
      compatibility: []
    }
  };

  return defaults[niche] || {};
}

module.exports = Product;
