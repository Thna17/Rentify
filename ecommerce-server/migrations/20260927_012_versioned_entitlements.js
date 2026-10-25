const { DataTypes } = require('sequelize');

exports.up = async ({ queryInterface }) => {
  const table = require('../models').StoreAccess.getTableName();
  const columns = await queryInterface.describeTable(table);
  if (!columns.entitlements) {
    await queryInterface.addColumn(table, 'entitlements', {
      type: DataTypes.JSON,
      allowNull: true,
    });
  }
  if (!columns.entitlementVersion) {
    await queryInterface.addColumn(table, 'entitlementVersion', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    });
  }
};
