// ecommerce-server/migrations/20261025_018_order_fulfillment_state_machines.js
// Migration 018: P3-ORD-001 Explicit Order, Fulfillment, Delivery, and Return State Machines.
// Adds explicit lifecycle columns and indexes to Orders and backfills existing orders.

const { DataTypes } = require('sequelize');

exports.up = async (contextOrQueryInterface, maybeSequelize) => {
  const queryInterface = contextOrQueryInterface.queryInterface || contextOrQueryInterface;
  const sequelize = contextOrQueryInterface.sequelize || maybeSequelize || queryInterface.sequelize;

  // 1. Describe table to safely add missing columns
  const orderTableInfo = await queryInterface.describeTable('Orders').catch(() => ({}));

  const columnsToAdd = {
    fulfillmentStatus: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'unfulfilled',
      comment: 'P3-ORD-001: Explicit fulfillment state (unfulfilled, processing, ready_for_pickup, shipped, out_for_delivery, delivered, failed, returned)',
    },
    returnStatus: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'none',
      comment: 'P3-ORD-001: Explicit return state (none, return_requested, return_approved, return_rejected, return_received, return_completed)',
    },
    cancellationReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'P3-ORD-001: Explicit cancellation reason provided by buyer or merchant',
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'P3-ORD-001: Timestamp when order cancellation occurred',
    },
    confirmedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'P3-ORD-001: Timestamp when merchant confirmed order',
    },
    deliveredAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'P3-ORD-001: Timestamp when order was physically delivered',
    },
    fulfillmentNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'P3-ORD-001: Notes regarding courier, pickup, or fulfillment actions',
    },
  };

  for (const [colName, colDef] of Object.entries(columnsToAdd)) {
    if (!orderTableInfo[colName]) {
      await queryInterface.addColumn('Orders', colName, colDef);
    }
  }

  // 2. Add indexes idempotently
  const orderIndexes = await queryInterface.showIndex('Orders').catch(() => []);
  const existingIndexNames = new Set(orderIndexes.map((idx) => idx.name));

  if (!existingIndexNames.has('idx_orders_fulfillment_status')) {
    await queryInterface.addIndex('Orders', ['fulfillmentStatus'], {
      name: 'idx_orders_fulfillment_status',
    }).catch(() => {});
  }

  if (!existingIndexNames.has('idx_orders_return_status')) {
    await queryInterface.addIndex('Orders', ['returnStatus'], {
      name: 'idx_orders_return_status',
    }).catch(() => {});
  }

  // 3. Backfill existing orders
  const [orders] = await sequelize.query(
    `SELECT id, status, deliveryStatus, createdAt, updatedAt
     FROM Orders`
  ).catch(() => [[]]);

  let backfilledCount = 0;
  for (const order of orders) {
    let targetFulfillment = 'unfulfilled';
    let targetReturn = 'none';
    let targetDeliveredAt = null;
    let targetCancelledAt = null;
    let targetConfirmedAt = null;

    if (['completed', 'fulfilled'].includes(order.status) || order.deliveryStatus === 'delivered') {
      targetFulfillment = 'delivered';
      targetDeliveredAt = order.updatedAt || order.createdAt;
      targetConfirmedAt = order.createdAt;
    } else if (order.status === 'cancelled') {
      targetFulfillment = 'unfulfilled';
      targetCancelledAt = order.updatedAt || order.createdAt;
    } else if (order.status === 'ready_for_pickup') {
      targetFulfillment = 'ready_for_pickup';
      targetConfirmedAt = order.createdAt;
    } else if (['processing', 'preparing'].includes(order.status)) {
      targetFulfillment = 'processing';
      targetConfirmedAt = order.createdAt;
    } else if (order.status === 'confirmed') {
      targetFulfillment = 'unfulfilled';
      targetConfirmedAt = order.updatedAt || order.createdAt;
    }

    await sequelize.query(
      `UPDATE Orders
       SET fulfillmentStatus = :fulfillmentStatus,
           returnStatus = :returnStatus,
           deliveredAt = COALESCE(deliveredAt, :deliveredAt),
           cancelledAt = COALESCE(cancelledAt, :cancelledAt),
           confirmedAt = COALESCE(confirmedAt, :confirmedAt)
       WHERE id = :id`,
      {
        replacements: {
          id: order.id,
          fulfillmentStatus: targetFulfillment,
          returnStatus: targetReturn,
          deliveredAt: targetDeliveredAt,
          cancelledAt: targetCancelledAt,
          confirmedAt: targetConfirmedAt,
        },
      }
    ).catch(() => {});

    backfilledCount += 1;
  }

  console.log(`[P3-ORD-001 Migration Audit] Orders lifecycle backfilled: ${backfilledCount}`);
};

exports.down = async (contextOrQueryInterface, maybeSequelize) => {
  const queryInterface = contextOrQueryInterface.queryInterface || contextOrQueryInterface;
  const orderTableInfo = await queryInterface.describeTable('Orders').catch(() => ({}));
  const orderIndexes = await queryInterface.showIndex('Orders').catch(() => []);
  const existingIndexNames = new Set(orderIndexes.map((idx) => idx.name));

  if (existingIndexNames.has('idx_orders_fulfillment_status')) {
    await queryInterface.removeIndex('Orders', 'idx_orders_fulfillment_status').catch(() => {});
  }
  if (existingIndexNames.has('idx_orders_return_status')) {
    await queryInterface.removeIndex('Orders', 'idx_orders_return_status').catch(() => {});
  }

  const columnsToRemove = [
    'fulfillmentStatus',
    'returnStatus',
    'cancellationReason',
    'cancelledAt',
    'confirmedAt',
    'deliveredAt',
    'fulfillmentNotes',
  ];

  for (const colName of columnsToRemove) {
    if (orderTableInfo[colName]) {
      await queryInterface.removeColumn('Orders', colName).catch(() => {});
    }
  }
};
