// models/CartItem.js (Updated for Variants)
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const CartItem = sequelize.define(
  "CartItem",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    cartId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "Carts",
        key: "id",
      },
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "Products",
        key: "id",
      },
    },
    variantId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "ProductVariants",
        key: "id",
      },
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 999
      },
    },
    // Price at time of adding to cart
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    // Compare price for showing discounts
    compareAtPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    // Selected options for this item
    selectedOptions: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
    // Customizations (for food, services, etc.)
    customizations: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
    // Gift wrapping, notes, etc.
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
    version: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
  },
  {
    indexes: [
      { fields: ["cartId"] },
      { fields: ["productId"] },
      { fields: ["variantId"] },
      { fields: ["version"] },
    ],
    getterMethods: {
      lineTotal() {
        return this.unitPrice * this.quantity;
      },
      hasDiscount() {
        return this.compareAtPrice && this.compareAtPrice > this.unitPrice;
      }
    }
  }
);

module.exports = CartItem;