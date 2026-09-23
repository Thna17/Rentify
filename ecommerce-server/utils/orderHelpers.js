const { Product } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require("../config/db");

exports.updateStockForOrderItems = async (orderItems, transaction) => {
  const sortedItems = [...orderItems].sort((a, b) => 
    a.productId.localeCompare(b.productId)
  );

  for (const item of sortedItems) {
    const product = await Product.findByPk(item.productId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!product) {
      throw new Error(`Product not found: ${item.productId}`);
    }

    if (product.stockQuantity < item.quantity) {
      throw new Error(`Insufficient stock for ${product.name}`);
    }

    const [updateCount] = await Product.update(
      {
        stockQuantity: sequelize.literal(`stockQuantity - ${item.quantity}`),
        version: sequelize.literal('version + 1')
      },
      {
        where: {
          id: product.id,
          version: product.version,
          stockQuantity: { [Op.gte]: item.quantity }
        },
        transaction
      }
    );

    if (updateCount === 0) {
      throw new Error(`Version conflict updating stock for ${product.name}`);
    }
  }
};