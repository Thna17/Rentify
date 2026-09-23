const { DataTypes } = require('sequelize');

exports.up = async ({ queryInterface }) => {
  const models = require('../models');
  const storeTable = models.StoreAccess.getTableName();
  const tables = await queryInterface.showAllTables();
  if (!tables.some((table) => String(table).toLowerCase() === String(storeTable).toLowerCase())) {
    await queryInterface.createTable(storeTable, {
      storeId: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      ownerUserId: { type: DataTypes.UUID, allowNull: false },
      websiteId: { type: DataTypes.UUID, allowNull: true, unique: true },
      primaryCategory: { type: DataTypes.STRING(120), allowNull: true },
      needsCategoryReview: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      marketplaceEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      marketplaceApprovalStatus: {
        type: DataTypes.ENUM('pending', 'approved', 'needs_changes', 'rejected', 'suspended'),
        allowNull: false,
      },
      status: { type: DataTypes.ENUM('active', 'suspended', 'closed'), allowNull: false },
      version: { type: DataTypes.INTEGER, allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
  }

  const storeIndexes = await queryInterface.showIndex(storeTable);
  if (!storeIndexes.some((index) => index.fields.map((field) => field.attribute).join(',') === 'ownerUserId')) {
    await queryInterface.addIndex(storeTable, ['ownerUserId'], { name: 'idx_store_access_owner' });
  }
  if (!storeIndexes.some((index) => index.unique && index.fields.map((field) => field.attribute).join(',') === 'websiteId')) {
    await queryInterface.addIndex(storeTable, ['websiteId'], { name: 'uq_store_access_website', unique: true });
  }

  const targets = [
    models.WebsiteData,
    models.Product,
    models.Category,
    models.Cart,
    models.Order,
    models.Invoice,
    models.Payment,
    models.UsageEvent,
    models.BillingStatement,
    models.PaymentGatewayConfig,
  ];
  for (const model of targets) {
    const table = model.getTableName();
    const columns = await queryInterface.describeTable(table);
    if (!columns.storeId) {
      await queryInterface.addColumn(table, 'storeId', { type: DataTypes.UUID, allowNull: true });
    }
    const indexes = await queryInterface.showIndex(table);
    if (!indexes.some((index) => index.fields.map((field) => field.attribute).join(',') === 'storeId')) {
      await queryInterface.addIndex(table, ['storeId'], { name: `idx_${String(table).toLowerCase()}_store` });
    }
  }

  const customerTable = models.Customer.getTableName();
  const customerColumns = await queryInterface.describeTable(customerTable);
  if (!customerColumns.tenantStoreId) {
    await queryInterface.addColumn(customerTable, 'tenantStoreId', { type: DataTypes.UUID, allowNull: true });
  }
  const customerIndexes = await queryInterface.showIndex(customerTable);
  if (!customerIndexes.some((index) => index.fields.map((field) => field.attribute).join(',') === 'tenantStoreId')) {
    await queryInterface.addIndex(customerTable, ['tenantStoreId'], { name: 'idx_customers_tenant_store' });
  }
};
