const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const WebsiteTemplate = sequelize.define(
  "WebsiteTemplate",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      // unique: true,
    },
    websiteTemplateId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    category: {
      type: DataTypes.ENUM('restaurant', 'ecommerce', 'cafe', 'blog', 'fashion'),
      allowNull: false,
    },
    framework: {
      type: DataTypes.ENUM('vite', 'nextjs'),
      allowNull: false,
    },
    baseUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    features: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    pages: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    colorPalette: {
      type: DataTypes.JSON,
      allowNull: true
    }
  },
  { timestamps: true }
);

module.exports = WebsiteTemplate;
