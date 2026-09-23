const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const TemplateContent = sequelize.define('TemplateContent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  label: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  value: {
    type: DataTypes.JSON,
    allowNull: true,
  },
}, { timestamps: true });

module.exports = TemplateContent;
