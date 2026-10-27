const { DataTypes } = require('sequelize');

exports.up = async ({ queryInterface }) => {
  const tableName = 'ProductImportJobs';
  const tables = await queryInterface.showAllTables();
  const hasTable = tables.some((table) => {
    const resolvedName = typeof table === 'string' ? table : table.tableName || table.table_name;
    return String(resolvedName).toLowerCase() === tableName.toLowerCase();
  });

  if (!hasTable) {
    await queryInterface.createTable(tableName, {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      storeId: { type: DataTypes.UUID, allowNull: false },
      idempotencyKey: { type: DataTypes.STRING(128), allowNull: false },
      sourceHash: { type: DataTypes.STRING(64), allowNull: false },
      sourceFilename: { type: DataTypes.STRING(255), allowNull: false },
      templateVersion: { type: DataTypes.STRING(16), allowNull: false, defaultValue: '1.0' },
      status: {
        type: DataTypes.ENUM('preview_ready', 'queued', 'processing', 'completed', 'completed_with_errors', 'failed'),
        allowNull: false,
        defaultValue: 'preview_ready',
      },
      rows: { type: DataTypes.JSON, allowNull: false },
      totalRows: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      validRows: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      warningRows: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      errorRows: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      processedRows: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      importedRows: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      failedRows: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      failureCode: { type: DataTypes.STRING(80), allowNull: true },
      failureMessage: { type: DataTypes.STRING(500), allowNull: true },
      startedAt: { type: DataTypes.DATE, allowNull: true },
      completedAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
  }

  const indexes = await queryInterface.showIndex(tableName);
  const indexNames = new Set(indexes.map((index) => index.name));
  if (!indexNames.has('uniq_product_import_store_key')) {
    await queryInterface.addIndex(tableName, ['storeId', 'idempotencyKey'], {
      unique: true, name: 'uniq_product_import_store_key',
    });
  }
  if (!indexNames.has('idx_product_import_store_created')) {
    await queryInterface.addIndex(tableName, ['storeId', 'createdAt'], {
      name: 'idx_product_import_store_created',
    });
  }
};
