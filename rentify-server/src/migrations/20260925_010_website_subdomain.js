const { DataTypes } = require('sequelize');

// Rentify-hosted storefront address: <subdomain>.<HOSTED_STOREFRONT_DOMAIN>.
// Assigned once when the Website is first published and kept afterwards.
exports.up = async ({ queryInterface }) => {
  const columns = await queryInterface.describeTable('Websites');
  if (!columns.subdomain) {
    await queryInterface.addColumn('Websites', 'subdomain', {
      type: DataTypes.STRING(63),
      allowNull: true,
    });
  }
  const indexes = await queryInterface.showIndex('Websites');
  if (!indexes.some((index) => index.name === 'uq_websites_subdomain')) {
    await queryInterface.addIndex('Websites', ['subdomain'], { unique: true, name: 'uq_websites_subdomain' });
  }
};
