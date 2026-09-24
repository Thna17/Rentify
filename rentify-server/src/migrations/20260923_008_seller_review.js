const { DataTypes } = require('sequelize');

exports.up = async ({ queryInterface }) => {
  const tables = await queryInterface.showAllTables();
  if (!tables.some((table) => String(table).toLowerCase() === 'sellerapplications')) {
    await queryInterface.createTable('SellerApplications', {
      storeId: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      responsibleName: { type: DataTypes.STRING(120), allowNull: false },
      pickupLocation: { type: DataTypes.STRING(255), allowNull: false },
      buyerContact: { type: DataTypes.STRING(120), allowNull: false },
      sampleProductDescription: { type: DataTypes.STRING(500), allowNull: false },
      acceptsDeliveryResponsibility: { type: DataTypes.BOOLEAN, allowNull: false },
      acceptsCodResponsibility: { type: DataTypes.BOOLEAN, allowNull: false },
      acceptsReturnsResponsibility: { type: DataTypes.BOOLEAN, allowNull: false },
      acceptsRefundResponsibility: { type: DataTypes.BOOLEAN, allowNull: false },
      status: { type: DataTypes.ENUM('pending', 'approved', 'needs_changes', 'rejected'), allowNull: false, defaultValue: 'pending' },
      reviewReason: { type: DataTypes.STRING(500), allowNull: true },
      submittedAt: { type: DataTypes.DATE, allowNull: false },
      reviewedAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
  }
  if (!tables.some((table) => String(table).toLowerCase() === 'sellerreviews')) {
    await queryInterface.createTable('SellerReviews', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      storeId: { type: DataTypes.UUID, allowNull: false },
      reviewerUserId: { type: DataTypes.UUID, allowNull: false },
      decision: { type: DataTypes.ENUM('approved', 'needs_changes', 'rejected', 'suspended'), allowNull: false },
      checklist: { type: DataTypes.JSON, allowNull: false },
      reason: { type: DataTypes.STRING(500), allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
    });
  }
  const indexes = await queryInterface.showIndex('SellerReviews');
  if (!indexes.some((index) => index.fields.map((field) => field.attribute).join(',') === 'storeId,createdAt')) {
    await queryInterface.addIndex('SellerReviews', ['storeId', 'createdAt'], { name: 'idx_seller_reviews_store_time' });
  }
  for (const [table, field, target, name] of [
    ['SellerApplications', 'storeId', 'Stores', 'fk_seller_app_store'],
    ['SellerReviews', 'storeId', 'Stores', 'fk_seller_review_store'],
    ['SellerReviews', 'reviewerUserId', 'Users', 'fk_seller_review_user'],
  ]) {
    const keys = await queryInterface.getForeignKeyReferencesForTable(table);
    if (!keys.some((key) => key.columnName === field)) {
      await queryInterface.addConstraint(table, {
        fields: [field], type: 'foreign key', name,
        references: { table: target, field: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE',
      });
    }
  }
};
