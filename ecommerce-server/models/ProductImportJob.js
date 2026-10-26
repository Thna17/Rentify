const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ProductImportJob = sequelize.define('ProductImportJob', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
  storeId: { type: DataTypes.UUID, allowNull: false },
  idempotencyKey: { type: DataTypes.STRING(128), allowNull: false },
  sourceHash: { type: DataTypes.STRING(64), allowNull: false },
  sourceFilename: { type: DataTypes.STRING(255), allowNull: false },
  templateVersion: { type: DataTypes.STRING(16), allowNull: false, defaultValue: '1.0' },
  status: {
    type: DataTypes.ENUM('preview_ready', 'queued', 'processing', 'completed', 'completed_with_errors', 'failed'),
    allowNull: false,
    defaultValue: 'preview_ready',
  },
  rows: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
  totalRows: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  validRows: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  warningRows: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  errorRows: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  processedRows: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  importedRows: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  failedRows: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  failureCode: { type: DataTypes.STRING(80), allowNull: true },
  failureMessage: { type: DataTypes.STRING(500), allowNull: true },
  startedAt: { type: DataTypes.DATE, allowNull: true },
  completedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  indexes: [
    { unique: true, fields: ['storeId', 'idempotencyKey'], name: 'uniq_product_import_store_key' },
    { fields: ['storeId', 'createdAt'], name: 'idx_product_import_store_created' },
  ],
});

module.exports = ProductImportJob;
