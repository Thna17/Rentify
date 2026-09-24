const { DataTypes } = require('sequelize');

exports.up = async ({ queryInterface }) => {
  const table = require('../models').StoreAccess.getTableName();
  const columns = await queryInterface.describeTable(table);
  if (!columns.marketplaceEntitlement) {
    await queryInterface.addColumn(table, 'marketplaceEntitlement', {
      type: DataTypes.ENUM('pilot', 'none'), allowNull: false, defaultValue: 'pilot',
    });
  }
};
