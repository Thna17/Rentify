const { Op } = require('sequelize');
const { Product, ProductVariant, StoreAccess, StoreDeliveryPolicy } = require('../../models');

const positive = (value) => Number.isFinite(Number(value)) && Number(value) > 0;

async function getLaunchFacts(storeId) {
  const store = await StoreAccess.findByPk(storeId, {
    attributes: ['storeId', 'websiteId', 'version'],
  });
  if (!store) {
    const error = new Error('Store projection not found');
    error.statusCode = 404;
    throw error;
  }

  const [deliveryPolicy, totalProducts, products] = await Promise.all([
    StoreDeliveryPolicy.findByPk(storeId, {
      attributes: ['storeId', 'version'],
    }),
    Product.count({ where: { storeId } }),
    Product.findAll({
      where: {
        storeId,
        status: 'active',
        price: { [Op.gt]: 0 },
        stockQuantity: { [Op.gt]: 0 },
        marketplaceCategory: { [Op.ne]: null },
      },
      attributes: [
        'id', 'status', 'price', 'stockQuantity', 'marketplaceCategory',
        'marketplaceVisibility',
      ],
      order: [['createdAt', 'ASC']],
    }),
  ]);

  const validProducts = products.filter((product) =>
    product.status === 'active' &&
    positive(product.price) &&
    Number.isSafeInteger(Number(product.stockQuantity)) &&
    Number(product.stockQuantity) > 0 &&
    Boolean(product.marketplaceCategory)
  );
  const validProductIds = validProducts.map((product) => product.id);
  const variant = validProductIds.length
    ? await ProductVariant.findOne({
      where: {
        productId: { [Op.in]: validProductIds },
        status: 'active',
        sku: { [Op.ne]: null },
      },
      attributes: ['productId', 'sku', 'price', 'stockQuantity'],
      order: [['createdAt', 'ASC']],
    })
    : null;
  const hasValidSku = Boolean(
    variant && String(variant.sku || '').trim() &&
    positive(variant.price) && Number(variant.stockQuantity) > 0
  );
  const marketplaceProductReady = validProducts.some((product) =>
    product.marketplaceVisibility !== false
  );

  return {
    observedAt: new Date().toISOString(),
    storeProjectionVersion: store.version,
    deliveryPolicyConfigured: Boolean(deliveryPolicy),
    deliveryPolicyVersion: deliveryPolicy?.version || null,
    totalProducts,
    hasValidProduct: validProducts.length > 0,
    hasValidSku,
    marketplaceProductReady,
  };
}

module.exports = { getLaunchFacts };
