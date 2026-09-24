const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

module.exports = sequelize.define('StoreDeliveryPolicy', {
  storeId: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
  flatFee: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'USD' },
  version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
});
