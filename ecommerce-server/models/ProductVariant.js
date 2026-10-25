// models/ProductVariant.js
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const ProductVariant = sequelize.define(
  "ProductVariant",
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
    storeId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    sku: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    barcode: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0.01 }
    },
    compareAtPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    costPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: "USD",
    },
    trackInventory: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    stockQuantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: { min: 0 }
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    weight: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
    },
    images: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    optionValues: {
      type: DataTypes.JSON,
      defaultValue: {},
      allowNull: false,
      validate: {
        isValidOptionValues(value) {
          if (value && typeof value !== 'object') {
            throw new Error('Option values must be an object');
          }
        }
      }
    },
    status: {
      type: DataTypes.ENUM("active", "disabled"),
      defaultValue: "active",
    },
    // Niche-specific variant data
    nicheData: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    version: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
  },
  {
    indexes: [
      { fields: ["productId"] },
      { fields: ["storeId"] },
      { fields: ["storeId", "sku"], unique: true, name: "uq_product_variants_store_sku" },
      { fields: ["storeId", "barcode"], unique: true, name: "uq_product_variants_store_barcode" },
      { fields: ["productId", "isDefault"] },
      { fields: ["status"] },
    ],
    hooks: {
      beforeValidate: async (variant, options) => {
        if ((!variant.storeId || !variant.currency) && variant.productId) {
          const Product = require('./Product');
          const product = await Product.findByPk(variant.productId, {
            attributes: ['storeId', 'currency'],
            transaction: options?.transaction,
          });
          if (product) {
            if (!variant.storeId && product.storeId) {
              variant.storeId = product.storeId;
            }
            if (!variant.currency && product.currency) {
              variant.currency = product.currency;
            }
          }
        }
        if (variant.barcode !== undefined) {
          variant.barcode = (typeof variant.barcode === 'string' && variant.barcode.trim()) ? variant.barcode.trim() : null;
        }
        if (variant.currency) {
          variant.currency = String(variant.currency).trim().toUpperCase();
        } else {
          variant.currency = 'USD';
        }
        if (!variant.sku && variant.productId) {
          const optionString = Object.values(variant.optionValues || {})
            .filter(val => val && val !== '')
            .join("-");
          variant.sku = `VAR-${variant.productId.slice(0, 8)}-${optionString || 'DEFAULT'}`.toUpperCase();
        }
      },
    },
  }
);

module.exports = ProductVariant;