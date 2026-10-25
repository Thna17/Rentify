const { DataTypes } = require('sequelize');

exports.up = async ({ queryInterface }) => {
  const table = require('../models').WebsiteData.getTableName();
  const columns = await queryInterface.describeTable(table);
  if (!columns.subdomain) {
    await queryInterface.addColumn(table, 'subdomain', {
      type: DataTypes.STRING(63),
      allowNull: true,
    });
  }
};
