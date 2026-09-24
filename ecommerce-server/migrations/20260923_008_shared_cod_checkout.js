const { DataTypes } = require('sequelize');

exports.up = async ({ queryInterface }) => {
  const carts = await queryInterface.describeTable('Carts');
  if (!carts.websiteId.allowNull) {
    await queryInterface.changeColumn('Carts', 'websiteId', { type: DataTypes.UUID, allowNull: true });
  }
  if (!carts.buyerId) {
    await queryInterface.addColumn('Carts', 'buyerId', { type: DataTypes.UUID, allowNull: true });
  }
  const cartIndexes = await queryInterface.showIndex('Carts');
  if (!cartIndexes.some((index) => index.name === 'uq_carts_store_buyer')) {
    await queryInterface.addIndex('Carts', ['storeId', 'buyerId'], {
      name: 'uq_carts_store_buyer', unique: true,
    });
  }

  const orders = await queryInterface.describeTable('Orders');
  if (!orders.websiteId.allowNull) {
    await queryInterface.changeColumn('Orders', 'websiteId', { type: DataTypes.UUID, allowNull: true });
  }
  const orderColumns = {
    buyerId: { type: DataTypes.UUID, allowNull: true },
    checkoutKey: { type: DataTypes.STRING(64), allowNull: true },
    salesChannel: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'storefront' },
    deliveryStatus: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'pending' },
  };
  for (const [name, definition] of Object.entries(orderColumns)) {
    if (!orders[name]) await queryInterface.addColumn('Orders', name, definition);
  }
  const orderIndexes = await queryInterface.showIndex('Orders');
  for (const [name, columns, unique] of [
    ['uq_orders_checkout_key', ['checkoutKey'], true],
    ['idx_orders_buyer_created', ['buyerId', 'createdAt'], false],
    ['idx_orders_store_created', ['storeId', 'createdAt'], false],
  ]) {
    if (!orderIndexes.some((index) => index.name === name)) {
      await queryInterface.addIndex('Orders', columns, { name, unique });
    }
  }

  const payments = await queryInterface.describeTable('Payments');
  const paymentColumns = {
    collectedAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    collectedAt: { type: DataTypes.DATE, allowNull: true },
    collectorId: { type: DataTypes.UUID, allowNull: true },
    refundedAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  };
  for (const [name, definition] of Object.entries(paymentColumns)) {
    if (!payments[name]) await queryInterface.addColumn('Payments', name, definition);
  }

  let events;
  try { events = await queryInterface.describeTable('OrderEvents'); } catch { events = null; }
  if (!events) {
    await queryInterface.createTable('OrderEvents', {
      id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
      orderId: { type: DataTypes.UUID, allowNull: false },
      storeId: { type: DataTypes.UUID, allowNull: false },
      actorId: { type: DataTypes.UUID, allowNull: false },
      eventKey: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      type: { type: DataTypes.STRING(32), allowNull: false },
      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      details: { type: DataTypes.JSON, allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex('OrderEvents', ['orderId', 'createdAt'], {
      name: 'idx_order_events_order_created',
    });
  }
};
