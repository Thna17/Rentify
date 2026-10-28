// ecommerce-server/migrations/20261025_020_invoice_fulfillment_lifecycle.js
// Migration 020: P3-INV-002 Slice 5 Invoice Fulfillment Stock Mutations.
// Adds stockReserved tracking to Orders, updates Invoice statuses to include draft and cancelled,
// and indexes store reservation queries.

const { DataTypes } = require('sequelize');

exports.up = async (contextOrQueryInterface, maybeSequelize) => {
  const queryInterface = contextOrQueryInterface.queryInterface || contextOrQueryInterface;
  const sequelize = contextOrQueryInterface.sequelize || maybeSequelize || queryInterface.sequelize;

  // 1. Add stockReserved column to Orders idempotently
  const orderTableDesc = await queryInterface.describeTable('Orders').catch(() => ({}));
  if (!orderTableDesc.stockReserved) {
    await queryInterface.addColumn('Orders', 'stockReserved', {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'P3-INV-002: Whether order items currently hold an active stock reservation',
    });
  }

  // 2. Add composite index on Orders (storeId, stockReserved) idempotently
  const existingOrderIndexes = await queryInterface.showIndex('Orders').catch(() => []);
  const orderIndexNames = new Set(existingOrderIndexes.map((idx) => idx.name));

  if (!orderIndexNames.has('idx_orders_store_stock_reserved')) {
    try {
      await queryInterface.addIndex('Orders', ['storeId', 'stockReserved'], {
        name: 'idx_orders_store_stock_reserved',
      });
    } catch (err) {
      // Index may already exist in some dialects
    }
  }

  // 3. Update Invoice status column to support draft and cancelled
  const invoiceTableDesc = await queryInterface.describeTable('Invoices').catch(() => ({}));
  if (invoiceTableDesc.status) {
    try {
      await queryInterface.changeColumn('Invoices', 'status', {
        type: DataTypes.STRING(32),
        defaultValue: 'pending',
        allowNull: false,
      });
    } catch (err) {
      // In dialect where changeColumn to STRING fails, continue safely
    }
  }
};

exports.down = async (contextOrQueryInterface) => {
  const queryInterface = contextOrQueryInterface.queryInterface || contextOrQueryInterface;

  const existingOrderIndexes = await queryInterface.showIndex('Orders').catch(() => []);
  const orderIndexNames = new Set(existingOrderIndexes.map((idx) => idx.name));
  if (orderIndexNames.has('idx_orders_store_stock_reserved')) {
    await queryInterface.removeIndex('Orders', 'idx_orders_store_stock_reserved').catch(() => {});
  }

  const orderTableDesc = await queryInterface.describeTable('Orders').catch(() => ({}));
  if (orderTableDesc.stockReserved) {
    await queryInterface.removeColumn('Orders', 'stockReserved').catch(() => {});
  }
};
