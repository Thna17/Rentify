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
    sku: {
      type: DataTypes.STRING,
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
    trackInventory: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    stockQuantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: { min: 0 }
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
      { fields: ["sku"], unique: true },
      { fields: ["status"] },
    ],
    hooks: {
      beforeValidate: (variant) => {
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