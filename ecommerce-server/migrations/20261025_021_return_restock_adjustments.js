// ecommerce-server/migrations/20261025_021_return_restock_adjustments.js
// Migration 021: P3-INV-002 Slice 6 Returns, Restocking and Administrative Adjustments.
// Adds stockRestocked tracking to Orders, condition and restockedQuantity tracking to OrderItems,
// and indexes store return restock queries.

const { DataTypes } = require('sequelize');

exports.up = async (contextOrQueryInterface, maybeSequelize) => {
  const queryInterface = contextOrQueryInterface.queryInterface || contextOrQueryInterface;
  const sequelize = contextOrQueryInterface.sequelize || maybeSequelize || queryInterface.sequelize;

  // 1. Add stockRestocked column to Orders idempotently
  const orderTableDesc = await queryInterface.describeTable('Orders').catch(() => ({}));
  if (!orderTableDesc.stockRestocked) {
    await queryInterface.addColumn('Orders', 'stockRestocked', {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'P3-INV-002: Whether return items have been physically restocked into inventory',
    });
  }

  // 2. Add composite index on Orders (storeId, stockRestocked) idempotently
  const existingOrderIndexes = await queryInterface.showIndex('Orders').catch(() => []);
  const orderIndexNames = new Set(existingOrderIndexes.map((idx) => idx.name));

  if (!orderIndexNames.has('idx_orders_store_stock_restocked')) {
    try {
      await queryInterface.addIndex('Orders', ['storeId', 'stockRestocked'], {
        name: 'idx_orders_store_stock_restocked',
      });
    } catch (err) {
      // Index may already exist
    }
  }

  // 3. Add returnCondition and restockedQuantity columns to OrderItems idempotently
  const orderItemTableDesc = await queryInterface.describeTable('OrderItems').catch(() => ({}));
  if (!orderItemTableDesc.returnCondition) {
    await queryInterface.addColumn('OrderItems', 'returnCondition', {
      type: DataTypes.STRING(32),
      defaultValue: null,
      allowNull: true,
      comment: 'P3-INV-002: Inspection outcome (resellable, damaged, non_resellable)',
    });
  }

  if (!orderItemTableDesc.restockedQuantity) {
    await queryInterface.addColumn('OrderItems', 'restockedQuantity', {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'P3-INV-002: Quantity restocked into sellable inventory',
    });
  }
};

exports.down = async (contextOrQueryInterface) => {
  const queryInterface = contextOrQueryInterface.queryInterface || contextOrQueryInterface;

  const existingOrderIndexes = await queryInterface.showIndex('Orders').catch(() => []);
  const orderIndexNames = new Set(existingOrderIndexes.map((idx) => idx.name));
  if (orderIndexNames.has('idx_orders_store_stock_restocked')) {
    await queryInterface.removeIndex('Orders', 'idx_orders_store_stock_restocked').catch(() => {});
  }

  const orderTableDesc = await queryInterface.describeTable('Orders').catch(() => ({}));
  if (orderTableDesc.stockRestocked) {
    await queryInterface.removeColumn('Orders', 'stockRestocked').catch(() => {});
  }

  const orderItemTableDesc = await queryInterface.describeTable('OrderItems').catch(() => ({}));
  if (orderItemTableDesc.restockedQuantity) {
    await queryInterface.removeColumn('OrderItems', 'restockedQuantity').catch(() => {});
  }
  if (orderItemTableDesc.returnCondition) {
    await queryInterface.removeColumn('OrderItems', 'returnCondition').catch(() => {});
  }
};
