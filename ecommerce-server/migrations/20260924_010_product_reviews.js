const { DataTypes } = require('sequelize');

exports.up = async ({ queryInterface }) => {
  let columns;
  try { columns = await queryInterface.describeTable('ProductReviews'); } catch { columns = null; }
  if (columns) return;
  await queryInterface.createTable('ProductReviews', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Products', key: 'id' },
      onDelete: 'CASCADE',
    },
    storeId: { type: DataTypes.UUID, allowNull: false },
    buyerUserId: { type: DataTypes.UUID, allowNull: false },
    buyerName: { type: DataTypes.STRING(120), allowNull: false },
    rating: { type: DataTypes.INTEGER, allowNull: false },
    comment: { type: DataTypes.TEXT, allowNull: false },
    isVerifiedPurchase: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    status: {
      type: DataTypes.ENUM('published', 'hidden', 'flagged'),
      allowNull: false,
      defaultValue: 'published',
    },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  });

  await queryInterface.addIndex('ProductReviews', ['productId', 'status']);
  await queryInterface.addIndex('ProductReviews', ['storeId']);
  await queryInterface.addIndex('ProductReviews', ['buyerUserId']);
  await queryInterface.addIndex('ProductReviews', ['productId', 'buyerUserId'], {
    unique: true,
    name: 'product_reviews_product_buyer_unique',
  });
};
