const { randomUUID } = require('node:crypto');
const { DataTypes } = require('sequelize');

const hasUniqueIndex = async (queryInterface, table, field) =>
  (await queryInterface.showIndex(table)).some((index) =>
    index.unique && index.fields.map((part) => part.attribute).join(',') === field
  );

exports.up = async ({ sequelize, queryInterface }) => {
  const tables = await queryInterface.showAllTables();
  if (!tables.some((table) => String(table).toLowerCase() === 'stores')) {
    await queryInterface.createTable('Stores', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      ownerUserId: { type: DataTypes.UUID, allowNull: false },
      name: { type: DataTypes.STRING(120), allowNull: false },
      slug: { type: DataTypes.STRING(160), allowNull: false },
      primaryCategory: { type: DataTypes.STRING(120), allowNull: true },
      needsCategoryReview: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      marketplaceEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      marketplaceApprovalStatus: {
        type: DataTypes.ENUM('pending', 'approved', 'needs_changes', 'rejected', 'suspended'),
        allowNull: false,
        defaultValue: 'pending',
      },
      status: {
        type: DataTypes.ENUM('active', 'suspended', 'closed'),
        allowNull: false,
        defaultValue: 'active',
      },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
  }

  if (!await hasUniqueIndex(queryInterface, 'Stores', 'ownerUserId')) {
    await queryInterface.addIndex('Stores', ['ownerUserId'], { name: 'uq_stores_owner', unique: true });
  }
  if (!await hasUniqueIndex(queryInterface, 'Stores', 'slug')) {
    await queryInterface.addIndex('Stores', ['slug'], { name: 'uq_stores_slug', unique: true });
  }

  const websiteColumns = await queryInterface.describeTable('Websites');
  if (!websiteColumns.storeId) {
    await queryInterface.addColumn('Websites', 'storeId', { type: DataTypes.UUID, allowNull: true });
  }

  // Existing Websites do not have a dependable marketplace category. Keep it
  // null and flag the merchant for classification instead of guessing.
  const [websites] = await sequelize.query('SELECT id, userId, name FROM Websites ORDER BY userId, id');
  const ownerIds = new Set();
  for (const website of websites) {
    if (ownerIds.has(website.userId)) {
      throw new Error(`Multiple Websites for owner ${website.userId}; resolve before Store backfill`);
    }
    ownerIds.add(website.userId);
  }

  await sequelize.transaction(async (transaction) => {
    for (const website of websites) {
      const [existing] = await sequelize.query(
        'SELECT id FROM Stores WHERE ownerUserId = ? LIMIT 1',
        { replacements: [website.userId], transaction }
      );
      const storeId = existing[0]?.id || randomUUID();
      if (!existing.length) {
        const now = new Date();
        await queryInterface.bulkInsert('Stores', [{
          id: storeId,
          ownerUserId: website.userId,
          name: (website.name || 'Store').slice(0, 120),
          slug: `store-${storeId}`,
          primaryCategory: null,
          needsCategoryReview: true,
          marketplaceEnabled: true,
          marketplaceApprovalStatus: 'pending',
          status: 'active',
          createdAt: now,
          updatedAt: now,
        }], { transaction });
      }
      await queryInterface.bulkUpdate('Websites', { storeId }, { id: website.id }, { transaction });
    }
  });

  if (!await hasUniqueIndex(queryInterface, 'Websites', 'storeId')) {
    await queryInterface.addIndex('Websites', ['storeId'], { name: 'uq_websites_store', unique: true });
  }
  const websiteKeys = await queryInterface.getForeignKeyReferencesForTable('Websites');
  if (!websiteKeys.some((key) => key.columnName === 'storeId')) {
    await queryInterface.addConstraint('Websites', {
      fields: ['storeId'], type: 'foreign key', name: 'fk_websites_store',
      references: { table: 'Stores', field: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT',
    });
  }
  const storeKeys = await queryInterface.getForeignKeyReferencesForTable('Stores');
  if (!storeKeys.some((key) => key.columnName === 'ownerUserId')) {
    await queryInterface.addConstraint('Stores', {
      fields: ['ownerUserId'], type: 'foreign key', name: 'fk_stores_owner',
      references: { table: 'Users', field: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT',
    });
  }
};
