const { DataTypes } = require('sequelize');

// A Store's logo, shown on marketplace store cards and the store page.
exports.up = async ({ queryInterface }) => {
  const columns = await queryInterface.describeTable('Stores');
  if (!columns.logoUrl) {
    await queryInterface.addColumn('Stores', 'logoUrl', {
      type: DataTypes.STRING(2048),
      allowNull: true,
    });
  }
};
