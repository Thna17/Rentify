const { DataTypes } = require('sequelize');

exports.up = async ({ queryInterface }) => {
  let columns;
  try { columns = await queryInterface.describeTable('StoreDeliveryPolicies'); } catch { columns = null; }
  if (columns) return;
  await queryInterface.createTable('StoreDeliveryPolicies', {
    storeId: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
    flatFee: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'USD' },
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  });
};
