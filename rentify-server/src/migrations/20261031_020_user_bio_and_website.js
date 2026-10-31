const { DataTypes } = require('sequelize');

exports.up = async ({ queryInterface }) => {
  const columns = await queryInterface.describeTable('Users');
  if (!columns.bio) {
    await queryInterface.addColumn('Users', 'bio', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
  }
  if (!columns.website) {
    await queryInterface.addColumn('Users', 'website', {
      type: DataTypes.STRING(255),
      allowNull: true,
    });
  }
};

exports.down = async ({ queryInterface }) => {
  const columns = await queryInterface.describeTable('Users');
  if (columns.bio) await queryInterface.removeColumn('Users', 'bio');
  if (columns.website) await queryInterface.removeColumn('Users', 'website');
};
