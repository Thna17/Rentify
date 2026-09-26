// builders/ProductBuilder.js
const ProductFactory = require('../patterns/ProductFactory');
const StrategyFactory = require('../factories/StrategyFactory');
const { logger } = require('../../../utils/logger');
const { Product, ProductVariant, ProductOption } = require('../../../models');
class ProductBuilder {
  constructor(websiteId, websiteNiche) {
    this.websiteId = websiteId;
    this.websiteNiche = websiteNiche;
    this.strategy = StrategyFactory.createStrategy(websiteNiche);
    this.productData = {};
    this.variants = [];
    this.options = [];
    this.transaction = null;
  }

  setTransaction(transaction) {
    this.transaction = transaction;
    return this;
  }

  setBasicInfo({ name, description, price, productType, status }) {
    const defaultType = {
      restaurant: 'food', cafe: 'beverage', fashion: 'clothing',
      skincare: 'cleanser', electronics: 'device', grocery: 'fresh',
    }[this.websiteNiche] || 'physical';
    this.productData = {
      name,
      description,
      price: parseFloat(price),
      productType: productType || defaultType,
      websiteId: this.websiteId,
      websiteNiche: this.websiteNiche,
      nicheAttributes: this.strategy.generateDefaultAttributes()
    };
    if (status !== undefined) this.productData.status = status;
    return this;
  }

  setInventoryInfo({ stockQuantity = 0, trackInventory = true, allowBackorders = false }) {
    this.productData.stockQuantity = parseInt(stockQuantity);
    this.productData.trackInventory = trackInventory;
    this.productData.allowBackorders = allowBackorders;
    return this;
  }

  setSeoInfo({ seoTitle, seoDescription, slug }) {
    this.productData.seoTitle = seoTitle;
    this.productData.seoDescription = seoDescription;
    this.productData.slug = slug || this.generateSlug(this.productData.name);
    return this;
  }

  setCategory(categoryId) {
    this.productData.categoryId = categoryId;
    return this;
  }

  setMarketplaceCategory(category, visibility) {
    this.productData.marketplaceCategory = category;
    if (visibility !== undefined) this.productData.marketplaceVisibility = visibility;
    return this;
  }

  setImages(images) {
    this.productData.images = Array.isArray(images) ? images : [];
    return this;
  }

  setTags(tags) {
    this.productData.tags = Array.isArray(tags) ? tags : [];
    return this;
  }

  setNicheAttributes(attributes) {
    this.productData.nicheAttributes = {
      ...this.productData.nicheAttributes,
      ...attributes
    };
    return this;
  }

  addVariants(variants) {
    this.variants = Array.isArray(variants) ? variants : [];
    return this;
  }

  addOptions(options) {
    this.options = Array.isArray(options) ? options : [];
    return this;
  }

  generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }

  validate() {
    const errors = [];

    // Basic validation
    if (!this.productData.name) {
      errors.push('Product name is required');
    }
    if (!this.productData.price || this.productData.price <= 0) {
      errors.push('Valid price is required');
    }

    // Strategy-specific validation
    const strategyErrors = this.strategy.validateProduct(this.productData);
    errors.push(...strategyErrors);

    // Options validation
    const optionErrors = this.strategy.validateOptions(this.options);
    errors.push(...optionErrors);

    // Duplicate option validation and color limit
    if (Array.isArray(this.options)) {
      const seenOptionNames = new Set();
      let colorCount = 0;
      for (const opt of this.options) {
        const name = (opt.name || '').trim().toLowerCase();
        if (name) {
          if (seenOptionNames.has(name)) {
            errors.push(`Duplicate option name "${opt.name}" is not allowed`);
          }
          seenOptionNames.add(name);
        }
        if (opt.type === 'color' || name === 'color') {
          colorCount++;
        }
        if (Array.isArray(opt.values)) {
          const seenVals = new Set();
          for (const val of opt.values) {
            const valStr = (typeof val === 'string' ? val : (val?.value || '')).trim().toLowerCase();
            if (valStr) {
              if (seenVals.has(valStr)) {
                errors.push(`Duplicate value "${typeof val === 'string' ? val : val?.value}" in option "${opt.name}"`);
              }
              seenVals.add(valStr);
            }
          }
        }
      }
      if (colorCount > 1) {
        errors.push('Only one Color option is allowed per product');
      }
    }

    // Variant uniqueness validation
    if (Array.isArray(this.variants) && this.variants.length > 0) {
      const seenCombos = new Set();
      for (const variant of this.variants) {
        if (variant.optionValues && typeof variant.optionValues === 'object') {
          const comboKey = Object.entries(variant.optionValues)
            .sort(([k1], [k2]) => k1.localeCompare(k2))
            .map(([k, v]) => `${k.toLowerCase()}:${String(v).toLowerCase()}`)
            .join('|');
          if (comboKey) {
            if (seenCombos.has(comboKey)) {
              errors.push(`Duplicate variant combination: ${comboKey}`);
            }
            seenCombos.add(comboKey);
          }
        }
      }
    }

    return errors;
  }

 async build() {
  const validationErrors = this.validate();
  if (validationErrors.length > 0) {
    throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
  }

  try {
    const product = await ProductFactory.createWithVariants(
      this.productData,
      this.variants,
      this.options,
      this.transaction
    );

    logger.info(`Product created successfully: ${product.id}`);
    console.log(`ProductFactory returned product:`, product);
    return product;
  } catch (error) {
    logger.error('Product creation failed:', error);
    throw error;
  }
}

  getRecommendedOptions(productType) {
    return this.strategy.getRecommendedOptions(productType);
  }
}

module.exports = ProductBuilder;
