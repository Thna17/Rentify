const { DataTypes } = require('sequelize');

exports.up = async ({ sequelize, queryInterface }) => {
  const storeColumns = await queryInterface.describeTable('Stores');
  if (!storeColumns.projectionVersion) {
    await queryInterface.addColumn('Stores', 'projectionVersion', {
      type: DataTypes.INTEGER, allowNull: false, defaultValue: 1,
    });
  }

  const tables = await queryInterface.showAllTables();
  if (!tables.some((table) => String(table).toLowerCase() === 'storesyncoutboxes')) {
    await queryInterface.createTable('StoreSyncOutboxes', {
      storeId: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      payload: { type: DataTypes.JSON, allowNull: false },
      version: { type: DataTypes.INTEGER, allowNull: false },
      status: { type: DataTypes.ENUM('pending', 'synced'), allowNull: false, defaultValue: 'pending' },
      attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      lastError: { type: DataTypes.STRING(500), allowNull: true },
      syncedAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
  }
  const indexes = await queryInterface.showIndex('StoreSyncOutboxes');
  if (!indexes.some((index) => index.fields.map((field) => field.attribute).join(',') === 'status,updatedAt')) {
    await queryInterface.addIndex('StoreSyncOutboxes', ['status', 'updatedAt'], {
      name: 'idx_store_sync_status_updated',
    });
  }

  const [stores] = await sequelize.query(`
    SELECT s.id, s.ownerUserId, s.primaryCategory, s.needsCategoryReview,
           s.marketplaceEnabled, s.marketplaceApprovalStatus, s.status,
           s.projectionVersion, w.id AS websiteId
    FROM Stores s LEFT JOIN Websites w ON w.storeId = s.id
  `);
  const now = new Date();
  for (const store of stores) {
    const payload = {
      storeId: store.id,
      ownerUserId: store.ownerUserId,
      websiteId: store.websiteId || null,
      primaryCategory: store.primaryCategory,
      needsCategoryReview: Boolean(store.needsCategoryReview),
      marketplaceEnabled: Boolean(store.marketplaceEnabled),
      marketplaceApprovalStatus: store.marketplaceApprovalStatus,
      status: store.status,
      version: store.projectionVersion,
    };
    await sequelize.query(`
      INSERT INTO StoreSyncOutboxes
        (storeId, payload, version, status, attempts, lastError, syncedAt, createdAt, updatedAt)
      VALUES (?, ?, ?, 'pending', 0, NULL, NULL, ?, ?)
      ON DUPLICATE KEY UPDATE payload = VALUES(payload), version = VALUES(version), status = 'pending', updatedAt = VALUES(updatedAt)
    `, { replacements: [store.id, JSON.stringify(payload), store.projectionVersion, now, now] });
  }
};
