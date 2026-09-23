const {

  Product,
  Order,
  OrderItem,

} = require("../models");

exports.updateStock = async (orderId, action, transaction) => {
  const order = await Order.findByPk(orderId, {
    include: [{ model: OrderItem, as: 'OrderItems' }],
    transaction,
    lock: transaction.LOCK.UPDATE
  });

  const modifier = action === 'deduct' ? -1 : 1;
  const sortedItems = order.OrderItems.sort((a, b) =>
    a.productId.localeCompare(b.productId)
  );

  for (const item of sortedItems) {
    const product = await Product.findByPk(item.productId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!product) throw new Error(`Product not found: ${item.productId}`);

    if (action === "deduct" && product.trackInventory && !product.allowBackorders && product.stockQuantity < item.quantity) {
      throw new Error(`Insufficient stock for ${product.name}`);
    }

    const stockQuantity = product.stockQuantity + modifier * item.quantity;
    await product.update({
      stockQuantity,
      version: product.version + 1,
      status: product.trackInventory && !product.allowBackorders && stockQuantity <= 0
        ? "out_of_stock"
        : product.status,
    }, { transaction });
  }

  await order.update({ stockDeducted: action === 'deduct' }, { transaction });
};
