// models/Category.js (port 4000)
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Category = sequelize.define(
  "Category",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    websiteId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    storeId: { type: DataTypes.UUID, allowNull: true },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("active", "inactive", "deleted"),
      defaultValue: "active",
    },
  },
  {
    indexes: [{ fields: ["websiteId"] }, { fields: ["name"] }],
  }
);

module.exports = Category;
