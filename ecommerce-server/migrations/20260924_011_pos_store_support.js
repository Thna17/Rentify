const { DataTypes } = require('sequelize');

exports.up = async ({ queryInterface }) => {
  const invoices = await queryInterface.describeTable('Invoices');
  if (invoices.websiteId && !invoices.websiteId.allowNull) {
    await queryInterface.changeColumn('Invoices', 'websiteId', {
      type: DataTypes.UUID,
      allowNull: true,
    });
  }

  const paymentConfigs = await queryInterface.describeTable('PaymentGatewayConfigs');
  if (paymentConfigs.websiteId && !paymentConfigs.websiteId.allowNull) {
    await queryInterface.changeColumn('PaymentGatewayConfigs', 'websiteId', {
      type: DataTypes.UUID,
      allowNull: true,
    });
  }

  const indexes = await queryInterface.showIndex('PaymentGatewayConfigs');
  if (!indexes.some((index) => index.fields.map((field) => field.attribute).join(',') === 'storeId,gateway')) {
    await queryInterface.addIndex('PaymentGatewayConfigs', ['storeId', 'gateway'], {
      name: 'idx_payment_gateway_configs_store_gateway',
    });
  }
};
