const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Package = sequelize.define(
  "Package",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: DataTypes.STRING,
    price: DataTypes.FLOAT,
    duration: DataTypes.STRING,
    features: DataTypes.JSON,
    limits: DataTypes.JSON,
  },
  { timestamps: true }
);

module.exports = Package;
