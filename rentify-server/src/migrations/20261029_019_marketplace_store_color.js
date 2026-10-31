const { DataTypes } = require('sequelize');
exports.up = async ({ queryInterface }) => {
  const columns = await queryInterface.describeTable('Stores');
  if (!columns.marketplaceColor) await queryInterface.addColumn('Stores', 'marketplaceColor', {
    type: DataTypes.STRING(7), allowNull: false, defaultValue: '#4f46e5',
  });
};
exports.down = async ({ queryInterface }) => {
  const columns = await queryInterface.describeTable('Stores');
  if (columns.marketplaceColor) await queryInterface.removeColumn('Stores', 'marketplaceColor');
};
