const { DataTypes } = require('sequelize');

exports.up = async ({ queryInterface }) => {
  const columns = await queryInterface.describeTable('Products');
  if (!columns.storefrontVisibility) {
    await queryInterface.addColumn('Products', 'storefrontVisibility', {
      type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true,
    });
  }
};

exports.down = async ({ queryInterface }) => {
  const columns = await queryInterface.describeTable('Products');
  if (columns.storefrontVisibility) await queryInterface.removeColumn('Products', 'storefrontVisibility');
};
