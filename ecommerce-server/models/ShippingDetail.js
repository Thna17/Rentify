// models/ShippingDetail.js
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const ShippingDetail = sequelize.define("ShippingDetail", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  province: DataTypes.STRING,
  district: DataTypes.STRING,
  commune: DataTypes.STRING,
  street: DataTypes.STRING,
  note: DataTypes.STRING,
});

module.exports = ShippingDetail;
