const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SellerApplication = sequelize.define('SellerApplication', {
  storeId: {
    type: DataTypes.UUID, primaryKey: true, allowNull: false,
    references: { model: 'Stores', key: 'id' },
  },
  responsibleName: { type: DataTypes.STRING(120), allowNull: false },
  pickupLocation: { type: DataTypes.STRING(255), allowNull: false },
  buyerContact: { type: DataTypes.STRING(120), allowNull: false },
  sampleProductDescription: { type: DataTypes.STRING(500), allowNull: false },
  acceptsDeliveryResponsibility: { type: DataTypes.BOOLEAN, allowNull: false },
  acceptsCodResponsibility: { type: DataTypes.BOOLEAN, allowNull: false },
  acceptsReturnsResponsibility: { type: DataTypes.BOOLEAN, allowNull: false },
  acceptsRefundResponsibility: { type: DataTypes.BOOLEAN, allowNull: false },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'needs_changes', 'rejected'),
    allowNull: false, defaultValue: 'pending',
  },
  reviewReason: { type: DataTypes.STRING(500), allowNull: true },
  submittedAt: { type: DataTypes.DATE, allowNull: false },
  reviewedAt: { type: DataTypes.DATE, allowNull: true },
}, { timestamps: true });

module.exports = SellerApplication;
