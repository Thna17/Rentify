const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ProductReview = sequelize.define('ProductReview', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Products', key: 'id' },
  },
  storeId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  buyerUserId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  buyerName: {
    type: DataTypes.STRING(120),
    allowNull: false,
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 5 },
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  isVerifiedPurchase: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  status: {
    type: DataTypes.ENUM('published', 'hidden', 'flagged'),
    allowNull: false,
    defaultValue: 'published',
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['productId', 'status'] },
    { fields: ['storeId'] },
    { fields: ['buyerUserId'] },
    { fields: ['productId', 'buyerUserId'], unique: true },
  ],
});

module.exports = ProductReview;
