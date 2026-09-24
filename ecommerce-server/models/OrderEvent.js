const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

module.exports = sequelize.define('OrderEvent', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  orderId: { type: DataTypes.UUID, allowNull: false },
  storeId: { type: DataTypes.UUID, allowNull: false },
  actorId: { type: DataTypes.UUID, allowNull: false },
  eventKey: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  type: { type: DataTypes.STRING(32), allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  details: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
}, { indexes: [{ fields: ['orderId', 'createdAt'] }] });
