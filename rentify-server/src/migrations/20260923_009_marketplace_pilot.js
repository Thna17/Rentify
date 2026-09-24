const { DataTypes } = require('sequelize');

exports.up = async ({ sequelize, queryInterface }) => {
  const storeColumns = await queryInterface.describeTable('Stores');
  if (!storeColumns.marketplaceEntitlement) {
    await queryInterface.addColumn('Stores', 'marketplaceEntitlement', {
      type: DataTypes.ENUM('pilot', 'none'), allowNull: false, defaultValue: 'pilot',
    });
  }
  const applicationColumns = await queryInterface.describeTable('SellerApplications');
  if (!applicationColumns.sampleProductDescription) {
    await queryInterface.addColumn('SellerApplications', 'sampleProductDescription', {
      type: DataTypes.STRING(500), allowNull: true,
    });
  }
  if (applicationColumns.sampleProductId) {
    await queryInterface.changeColumn('SellerApplications', 'sampleProductId', {
      type: DataTypes.UUID, allowNull: true,
    });
  }
  await queryInterface.changeColumn('SellerApplications', 'sampleProductDescription', {
    type: DataTypes.STRING(500), allowNull: false,
  });

  const [rows] = await sequelize.query(`
    SELECT o.storeId, o.payload, s.marketplaceEntitlement, s.projectionVersion
    FROM StoreSyncOutboxes o JOIN Stores s ON s.id = o.storeId
  `);
  for (const row of rows) {
    const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
    payload.marketplaceEntitlement = row.marketplaceEntitlement;
    const version = Number(row.projectionVersion) + 1;
    payload.version = version;
    await sequelize.query('UPDATE Stores SET projectionVersion = ? WHERE id = ?', {
      replacements: [version, row.storeId],
    });
    await sequelize.query(`
      UPDATE StoreSyncOutboxes
      SET payload = ?, version = ?, status = 'pending', syncedAt = NULL
      WHERE storeId = ?
    `, { replacements: [JSON.stringify(payload), version, row.storeId] });
  }
};
