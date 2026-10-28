// ecommerce-server/migrations/20261026_024_cod_payment_state_machine.js
// Migration 024: P3-COD-001 COD Payment and Refund State Machine.
// Modifies Payments.status to support COD states:
// pending, collected, partially_refunded, refunded, failed, cancelled.
// Adds performance indexes on Payments and OrderEvents.

const { DataTypes } = require('sequelize');

exports.up = async (contextOrQueryInterface, maybeSequelize) => {
  const queryInterface = contextOrQueryInterface.queryInterface || contextOrQueryInterface;
  const sequelize = contextOrQueryInterface.sequelize || maybeSequelize || queryInterface.sequelize;

  // 1. Modify Payments.status to VARCHAR(32) to support the complete COD state machine
  try {
    await sequelize.query(`
      ALTER TABLE Payments MODIFY COLUMN status VARCHAR(32) NOT NULL DEFAULT 'pending'
    `);
  } catch (_err) {
    await queryInterface.changeColumn('Payments', 'status', {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'pending',
    }).catch(() => {});
  }

  // 2. Add index on Payments (storeId, status)
  const paymentIndexes = await queryInterface.showIndex('Payments').catch(() => []);
  const paymentIndexNames = new Set(paymentIndexes.map((idx) => idx.name));

  if (!paymentIndexNames.has('idx_payments_store_status')) {
    try {
      await queryInterface.addIndex('Payments', ['storeId', 'status'], {
        name: 'idx_payments_store_status',
      });
    } catch (_err) {}
  }

  // 3. Add index on OrderEvents (orderId, type) for fast COD reconciliation and event retrieval
  const eventIndexes = await queryInterface.showIndex('OrderEvents').catch(() => []);
  const eventIndexNames = new Set(eventIndexes.map((idx) => idx.name));

  if (!eventIndexNames.has('idx_order_events_order_type')) {
    try {
      await queryInterface.addIndex('OrderEvents', ['orderId', 'type'], {
        name: 'idx_order_events_order_type',
      });
    } catch (_err) {}
  }
};

exports.down = async (contextOrQueryInterface) => {
  const queryInterface = contextOrQueryInterface.queryInterface || contextOrQueryInterface;

  try {
    await queryInterface.removeIndex('Payments', 'idx_payments_store_status');
  } catch (_err) {}

  try {
    await queryInterface.removeIndex('OrderEvents', 'idx_order_events_order_type');
  } catch (_err) {}
};
