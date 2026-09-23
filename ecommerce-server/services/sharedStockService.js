const { Product, ProductVariant } = require('../models');

function fail(message, statusCode = 409) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

// Every order path should lock Products in ID order and call this helper while
// its order transaction is open. It never promotes drafts or archived items.
async function changeStock(productId, delta, transaction, variantId = null) {
  if (!Number.isSafeInteger(delta) || delta === 0) fail('Invalid stock change', 400);
  if (!transaction) fail('Stock changes require an order transaction', 500);
  const product = await Product.findByPk(productId, {
    transaction, lock: transaction.LOCK.UPDATE,
  });
  if (!product) fail('Product not found', 404);
  if (delta < 0 && product.status !== 'active') fail('Product is not available');
  if (variantId) {
    const variant = await ProductVariant.findOne({ where: { id: variantId, productId },
      transaction, lock: transaction.LOCK.UPDATE });
    if (!variant || (delta < 0 && variant.status !== 'active')) fail('Variant is not available');
    if (!variant.trackInventory) return variant;
    const nextVariantStock = variant.stockQuantity + delta;
    if (nextVariantStock < 0) fail(`Only ${variant.stockQuantity} left in stock`);
    await variant.update({ stockQuantity: nextVariantStock, version: variant.version + 1 }, { transaction });
    return variant;
  }
  if (!product.trackInventory) return product;
  const next = product.stockQuantity + delta;
  if (next < 0) fail(`Only ${product.stockQuantity} left in stock`);
  const nextStatus = next === 0 && product.status === 'active'
    ? 'out_of_stock'
    : (next > 0 && product.status === 'out_of_stock' ? 'active' : product.status);
  await product.update({ stockQuantity: next, status: nextStatus, version: product.version + 1 }, { transaction });
  return product;
}

module.exports = { changeStock };
