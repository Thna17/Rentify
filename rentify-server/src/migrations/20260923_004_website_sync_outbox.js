const { DataTypes } = require('sequelize');

exports.up = async ({ queryInterface }) => {
  const tables = await queryInterface.showAllTables();
  if (tables.some((table) => String(table).toLowerCase() === 'websitesyncoutboxes')) return;

  await queryInterface.createTable('WebsiteSyncOutboxes', {
    websiteId: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
    payload: { type: DataTypes.JSON, allowNull: false },
    status: { type: DataTypes.ENUM('pending', 'synced'), allowNull: false, defaultValue: 'pending' },
    attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    lastError: { type: DataTypes.STRING(500), allowNull: true },
    syncedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  });
  await queryInterface.addIndex('WebsiteSyncOutboxes', ['status', 'updatedAt'], {
    name: 'idx_website_sync_status_updated',
  });
};
