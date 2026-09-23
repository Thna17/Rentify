// patterns/ProductFactory.js
const { Product, ProductVariant, ProductOption } = require('../../../models');

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
    const product = await this.createProduct(productData, transaction);
    
    if (variants.length > 0) {
      const variantPromises = variants.map(variant => 
        this.createVariant({ ...variant, productId: product.id }, transaction)
      );
      await Promise.all(variantPromises);
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