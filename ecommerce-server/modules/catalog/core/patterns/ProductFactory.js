// patterns/ProductFactory.js
const { Product, ProductVariant, ProductOption } = require('../../../../models');

class ProductFactory {
  static createProduct(data, transaction = null) {
    return Product.create(data, { transaction });
  }

  static createVariant(data, transaction = null) {
    return ProductVariant.create(data, { transaction });
  }

  static createOption(data, transaction = null) {
    return ProductOption.create(data, { transaction });
  }

  static async createWithVariants(productData, variants = [], options = [], transaction = null) {
    const hasVariants = Array.isArray(variants) && variants.length > 0;
    const cleanId = (productData.name || 'product').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8).toUpperCase() || 'ITEM';
    const resolvedSku = productData.sku || `SKU-${cleanId}-${require('node:crypto').randomUUID().slice(0, 4).toUpperCase()}`;

    const product = await this.createProduct({
      ...productData,
      hasVariants,
      sku: resolvedSku,
      currency: productData.currency || 'USD',
      barcode: productData.barcode || null,
    }, transaction);
    
    if (hasVariants) {
      const variantPromises = variants.map((variant, index) => 
        this.createVariant({
          ...variant,
          productId: product.id,
          storeId: product.storeId,
          currency: variant.currency || product.currency || 'USD',
          barcode: variant.barcode || null,
          isDefault: variant.isDefault !== undefined ? Boolean(variant.isDefault) : (index === 0 && !variants.some(v => v.isDefault)),
        }, transaction)
      );
      await Promise.all(variantPromises);
    } else {
      // Simple Product: create one default SKU
      await this.createVariant({
        productId: product.id,
        storeId: product.storeId,
        sku: product.sku,
        barcode: product.barcode || null,
        price: product.price,
        compareAtPrice: product.compareAtPrice || null,
        currency: product.currency || 'USD',
        trackInventory: product.trackInventory !== false,
        stockQuantity: product.stockQuantity || 0,
        isDefault: true,
        optionValues: {},
        status: (product.status === 'archived' || product.status === 'draft') ? 'disabled' : 'active',
        version: 0,
      }, transaction);
    }

    if (options.length > 0) {
      const optionPromises = options.map(option => 
        this.createOption({ ...option, productId: product.id }, transaction)
      );
      await Promise.all(optionPromises);
    }

    return product;
  }
}

module.exports = ProductFactory;