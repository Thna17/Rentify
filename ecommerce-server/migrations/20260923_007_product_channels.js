const { DataTypes } = require('sequelize');

exports.up = async ({ queryInterface }) => {
  const columns = await queryInterface.describeTable('Products');
  if (!columns.marketplaceCategory) {
    await queryInterface.addColumn('Products', 'marketplaceCategory', {
      type: DataTypes.STRING(120), allowNull: true,
    });
  }
  if (!columns.marketplaceVisibility) {
    await queryInterface.addColumn('Products', 'marketplaceVisibility', {
      type: DataTypes.BOOLEAN, allowNull: true,
    });
  }
  if (!columns.websiteId.allowNull) {
    await queryInterface.changeColumn('Products', 'websiteId', {
      type: DataTypes.UUID, allowNull: true,
    });
  }
  const indexes = await queryInterface.showIndex('Products');
  if (!indexes.some((index) => index.fields.map((field) => field.attribute).join(',') === 'storeId,slug')) {
    await queryInterface.addIndex('Products', ['storeId', 'slug'], {
      name: 'uq_products_store_slug', unique: true,
    });
  }
  if (!indexes.some((index) => index.fields.map((field) => field.attribute).join(',') === 'marketplaceCategory,status')) {
    await queryInterface.addIndex('Products', ['marketplaceCategory', 'status'], {
      name: 'idx_products_marketplace_category_status',
    });
  }
};
