// services/ProductService.js
const {
  Product,
  ProductVariant,
  ProductOption,
  Category,
  WebsiteData,
} = require("../../models");
const { Op } = require("sequelize");
const ProductBuilder = require("./core/builders/ProductBuilder");
const StrategyFactory = require("./core/factories/StrategyFactory");
const { logger } = require("../../utils/logger");
const { ApiError } = require("../../utils/ApiError");
const { canonicalCategory } = require('../../config/marketplaceTaxonomy');

const STORE_OR_NICHE_TO_MARKETPLACE_CATEGORY = {
  'beauty & skincare': 'Skincare',
  'beauty': 'Beauty',
  'skincare': 'Skincare',
  'fashion & apparel': 'Clothing',
  'fashion': 'Clothing',
  'clothing': 'Clothing',
  'electronics & gadgets': 'Phones & Devices',
  'electronics': 'Phones & Devices',
  'food & beverage': 'Food & Beverage',
  'restaurant': 'Food & Beverage',
  'cafe': 'Food & Beverage',
  'grocery': 'Groceries',
  'groceries': 'Groceries',
  'handmade crafts & gifts': 'Handmade Crafts',
  'home & living': 'Home Goods',
  'jewelry & watches': 'Jewelry',
  'health & wellness': 'Beauty',
};

function inferMarketplaceCategory(primaryCategory, websiteNiche) {
  const normPrimary = String(primaryCategory || '').trim().toLowerCase();
  if (normPrimary && STORE_OR_NICHE_TO_MARKETPLACE_CATEGORY[normPrimary]) {
    return STORE_OR_NICHE_TO_MARKETPLACE_CATEGORY[normPrimary];
  }
  const normNiche = String(websiteNiche || '').trim().toLowerCase();
  if (normNiche && STORE_OR_NICHE_TO_MARKETPLACE_CATEGORY[normNiche]) {
    return STORE_OR_NICHE_TO_MARKETPLACE_CATEGORY[normNiche];
  }
  return canonicalCategory(primaryCategory) || 'Other';
}

function validMarketplaceCategory(value) {
  if (value === undefined || value === null || value === '') return null;
  const category = canonicalCategory(value);
  if (!category) throw new ApiError(400, 'Choose a valid marketplace category');
  return category;
}

function validMarketplaceVisibility(value) {
  if (value !== undefined && value !== null && typeof value !== 'boolean') {
    throw new ApiError(400, 'Marketplace visibility must be true, false, or null');
  }
  return value;
}

class ProductService {
  /**
   * Link a Store's products that have no website yet to that Store's website.
   * Called when Core first projects a website for an existing Store, so
   * products created before the storefront appear on it.
   */
  static async attachStoreProductsToWebsite(storeId, websiteId) {
    // This bulk update only links existing products. Validating Sequelize's
    // partial update instance runs product-type hooks against default values
    // and rejects valid non-ecommerce website niches, even with no products.
    return Product.update({ websiteId }, { where: { storeId, websiteId: null }, validate: false });
  }

  constructor(websiteId, options = {}) {
    if (typeof options === 'object' && options !== null) {
      this.websiteId = options.websiteId !== undefined ? options.websiteId : websiteId;
      this.storeId = options.storeId !== undefined ? options.storeId : null;
    } else {
      this.websiteId = websiteId;
      this.storeId = null;
    }
    this.identifier = websiteId;
  }

  async resolveStoreWhere(transaction = null) {
    let resolvedWebsiteId = this.websiteId;
    let resolvedStoreId = this.storeId;

    if (this.websiteId) {
      const website = await WebsiteData.findOne({
        where: { websiteId: this.websiteId },
        attributes: ['storeId', 'websiteId'],
        transaction,
      });
      if (website) {
        resolvedWebsiteId = website.websiteId;
        resolvedStoreId = resolvedStoreId || website.storeId;
      }
    }

    if (!resolvedStoreId && this.identifier) {
      const { StoreAccess } = require('../../models');
      const store = await StoreAccess.findByPk(this.identifier, { transaction });
      if (store) {
        resolvedStoreId = store.storeId;
        if (store.websiteId) {
          resolvedWebsiteId = resolvedWebsiteId || store.websiteId;
        }
      }
    }

    if (resolvedWebsiteId && resolvedStoreId) {
      return { [Op.or]: [{ websiteId: resolvedWebsiteId }, { storeId: resolvedStoreId }] };
    }
    if (resolvedStoreId) {
      return { storeId: resolvedStoreId };
    }
    return { websiteId: resolvedWebsiteId || this.identifier };
  }

  async getWebsiteNiche() {
    if (this.websiteId) {
      const website = await WebsiteData.findOne({
        where: { websiteId: this.websiteId },
        attributes: ["niche"],
      });
      if (website?.niche) return website.niche;
    }
    return "ecommerce";
  }

  async findAll(options = {}) {
    const {
      page = 1,
      limit = 12,
      sort = "newest",
      search,
      category,
      minPrice,
      maxPrice,
      status = "active",
      productType,
      inStock,
    } = options;

    const where = await this.resolveStoreWhere();
    // Products the merchant hid from the storefront stay out of public listings
    if (status !== "all") where.storefrontVisibility = { [Op.ne]: false };
    const include = [
      {
        model: Category,
        attributes: ["id", "name"],
      },
      {
        model: ProductVariant,
        as: "ProductVariants",
        where: status === "all" ? undefined : { status: "active" },
        required: false,
      },
      {
        model: ProductOption,
        as: "ProductOptions",
        required: false,
      },
    ];

    // Build where conditions
    this.buildWhereConditions(where, {
      status,
      search,
      category,
      minPrice,
      maxPrice,
      productType,
      inStock,
    });

    // Build order
    const order = this.buildOrder(sort);

    try {
      const products = await Product.findAndCountAll({
        where,
        include,
        order,
        limit: parseInt(limit),
        offset: (page - 1) * limit,
        distinct: true,
      });

      return {
        totalItems: products.count,
        totalPages: Math.ceil(products.count / limit),
        currentPage: parseInt(page),
        products: products.rows,
      };
    } catch (error) {
      logger.error("Error finding products:", error);
      throw new ApiError(500, "Failed to fetch products");
    }
  }

  buildWhereConditions(where, filters) {
    const {
      status,
      search,
      category,
      minPrice,
      maxPrice,
      productType,
      inStock,
    } = filters;

    if (status && status !== "all") {
      where.status = status;
    }

    if (productType) {
      where.productType = productType;
    }

    if (search) {
      const cleanedSearch = search.trim();
      where[Op.or] = [
        { name: { [Op.like]: `%${cleanedSearch}%` } },
        { description: { [Op.like]: `%${cleanedSearch}%` } },
        { tags: { [Op.like]: `%${cleanedSearch}%` } },
      ];
    }

    if (category) {
      const categoryList = Array.isArray(category)
        ? category
        : category.split(",");
      where.categoryId = { [Op.in]: categoryList };
    }

    if (minPrice !== undefined && isNaN(parseFloat(minPrice))) {
      throw new ApiError(400, "minPrice must be a valid number");
    }
    if (maxPrice !== undefined && isNaN(parseFloat(maxPrice))) {
      throw new ApiError(400, "maxPrice must be a valid number");
    }

    if (inStock === "true") {
      where[Op.or] = [
        { trackInventory: false },
        {
          [Op.and]: [
            { trackInventory: true },
            { stockQuantity: { [Op.gt]: 0 } },
          ],
        },
      ];
    }
  }

  buildOrder(sort) {
    const orderMap = {
      price_asc: [["price", "ASC"]],
      price_desc: [["price", "DESC"]],
      name_asc: [["name", "ASC"]],
      name_desc: [["name", "DESC"]],
      featured: [
        ["feature", "DESC"],
        ["createdAt", "DESC"],
      ],
      newest: [["createdAt", "DESC"]],
    };

    return orderMap[sort] || [["createdAt", "DESC"]];
  }

  async findById(productId, transaction = null, options = {}) {
    try {
      const storeCondition = await this.resolveStoreWhere(transaction);
      const variantWhere = options.activeOnly ? { status: "active" } : undefined;
      const queryOptions = {
        where: {
          id: productId,
          ...storeCondition,
        },
      include: [
        {
          model: Category,
          attributes: ["id", "name"],
        },
        {
          model: ProductVariant,
          as: "ProductVariants",
          where: variantWhere,
          required: false,
        },
        {
          model: ProductOption,
          as: "ProductOptions",
          required: false,
          order: [["position", "ASC"]],
        },
      ],
    };

    // Add transaction if provided
    if (transaction) {
      queryOptions.transaction = transaction;
    }

    const product = await Product.findOne(queryOptions);

    if (!product) {
      throw new ApiError(404, "Product not found");
    }

    return product;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error("Error finding product by ID:", error);
    throw new ApiError(500, "Failed to fetch product");
  }
}


  async findBySlug(slug) {
    try {
      const storeCondition = await this.resolveStoreWhere();
      const product = await Product.findOne({
        where: {
          ...storeCondition,
          slug,
          status: { [Op.in]: ["active", "draft"] },
        },
        include: [
          {
            model: Category,
            attributes: ["id", "name"],
          },
          {
            model: ProductVariant,
            as: "ProductVariants",
            where: { status: "active" },
            required: false,
          },
          {
            model: ProductOption,
            as: "ProductOptions",
            required: false,
            order: [["position", "ASC"]],
          },
        ],
      });

      if (!product) {
        throw new ApiError(404, "Product not found");
      }

      return product;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error("Error finding product by slug:", error);
      throw new ApiError(500, "Failed to fetch product");
    }
  }

async create(productData, transaction = null) {
  const websiteNiche = await this.getWebsiteNiche();
  let defaultMarketplaceCategory = inferMarketplaceCategory(null, websiteNiche);
  try {
    const storeCondition = await this.resolveStoreWhere(transaction);
    if (storeCondition?.storeId) {
      const { StoreAccess, Product } = require('../../models');
      const store = await StoreAccess.findByPk(storeCondition.storeId, {
        transaction,
        lock: transaction ? transaction.LOCK.UPDATE : undefined,
      });
      if (store) {
        const { getStoreEntitlements } = require('../store-access').storeAccessService;
        const entitlements = getStoreEntitlements(store);
        if (!entitlements.mutationsAllowed) {
          throw new ApiError(
            403,
            entitlements.restrictionReason || 'Product creation is disabled during subscription grace period or suspension',
            'CAPABILITY_MUTATION_LOCKED'
          );
        }
        const currentCount = await Product.count({ where: { storeId: store.storeId }, transaction });
        const productLimit = entitlements.capabilities?.productLimit ?? 25;
        if (currentCount >= productLimit) {
          throw new ApiError(
            403,
            `Store has reached the product limit of ${productLimit} for the ${entitlements.displayName || 'current'} plan`,
            'PRODUCT_LIMIT_EXCEEDED'
          );
        }
        if (store.primaryCategory) {
          defaultMarketplaceCategory = inferMarketplaceCategory(store.primaryCategory, websiteNiche);
        }
      }
    }
  } catch {
    // Non-fatal fallback
  }

  const builder = new ProductBuilder(this.websiteId, websiteNiche);

  if (transaction) {
    builder.setTransaction(transaction);
  }

  try {
    const resolvedMarketplaceCategory = validMarketplaceCategory(productData.marketplaceCategory) || defaultMarketplaceCategory;
    builder
      .setBasicInfo(productData)
      .setInventoryInfo(productData)
      .setSeoInfo(productData)
      .setCategory(productData.categoryId)
      .setMarketplaceCategory(resolvedMarketplaceCategory,
        validMarketplaceVisibility(productData.marketplaceVisibility),
        productData.storefrontVisibility)
      .setImages(productData.images)
      .setTags(productData.tags)
      .setCanonicalIdentity(productData)
      .setNicheAttributes(productData.nicheAttributes || {});

    if (productData.variants) {
      builder.addVariants(productData.variants);
    }

    if (productData.options) {
      builder.addOptions(productData.options);
    }

    const product = await builder.build();
    // Use the same transaction to fetch the product
    return await this.findById(product.id, transaction);
  } catch (error) {
    logger.error("Error creating product:", error);
    throw new ApiError(400, `Failed to create product: ${error.message}`);
  }
}

  async update(productId, updates, transaction = null) {
    try {
      const storeCondition = await this.resolveStoreWhere(transaction);
      const product = await Product.findOne({
        where: { id: productId, ...storeCondition },
        transaction,
        lock: transaction?.LOCK.UPDATE,
      });
      if (!product) throw new ApiError(404, 'Product not found');
      if (!Number.isSafeInteger(updates.expectedVersion) ||
          updates.expectedVersion !== product.version) {
        throw new ApiError(409, 'Product version has changed; refresh and retry');
      }

      const updateData = { ...updates };
      for (const protectedField of ['id', 'websiteId', 'storeId', 'websiteNiche', 'version', 'expectedVersion', 'createdAt', 'updatedAt']) {
        delete updateData[protectedField];
      }
      if (updates.marketplaceCategory !== undefined) {
        updateData.marketplaceCategory = validMarketplaceCategory(updates.marketplaceCategory);
      }
      if (updates.storefrontVisibility !== undefined && typeof updates.storefrontVisibility !== 'boolean') {
        throw new ApiError(400, 'Storefront visibility must be true or false');
      }
      if (updates.marketplaceVisibility !== undefined) {
        updateData.marketplaceVisibility = validMarketplaceVisibility(updates.marketplaceVisibility);
      }
      if (updates.stockQuantity !== undefined) {
        const nextQty = Number(updates.stockQuantity);
        if (nextQty > 0 && product.status === 'out_of_stock' && updates.status === undefined) {
          updateData.status = 'active';
        } else if (nextQty === 0 && product.status === 'active' && updates.status === undefined && !product.allowBackorders) {
          updateData.status = 'out_of_stock';
        }

        // Route stock adjustment through canonical inventory ledger
        const currentQty = product.stockQuantity || 0;
        const delta = nextQty - currentQty;
        if (delta !== 0) {
          const { inventoryLedgerService } = require('../inventory');
          const storeId = product.storeId || (await this.getStoreId(transaction)) || this.websiteId;
          const defaultVariant = await ProductVariant.findOne({ where: { productId, isDefault: true }, transaction }).catch(() => null);
          const targetSkuId = defaultVariant?.id || product.id;
          if (typeof inventoryLedgerService?.adjustBalance === 'function') {
            await inventoryLedgerService.adjustBalance({
              storeId,
              skuId: targetSkuId,
              delta,
              reasonCode: delta > 0 ? 'restock' : 'manual_adjustment',
              sourceType: 'manual',
              sourceId: productId,
              actor: { id: this.websiteId || 'merchant', type: 'merchant' },
              idempotencyKey: `prod-upd-${productId}-${Date.now()}`,
              notes: updates.reason || updates.note || 'Product update stock adjustment',
            }, { transaction }).catch(() => {});
          }
        }
        delete updateData.stockQuantity;
      }
      delete updateData.variants;
      delete updateData.options;
      updateData.version = product.version + 1;

      await product.update(updateData, { transaction });

      // Validate options update
      if (Array.isArray(updates.options)) {
        const seenOptionNames = new Set();
        let colorCount = 0;
        for (const opt of updates.options) {
          const name = (opt.name || '').trim().toLowerCase();
          if (name) {
            if (seenOptionNames.has(name)) {
              throw new ApiError(400, `Duplicate option name "${opt.name}" is not allowed`);
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
                  throw new ApiError(400, `Duplicate value "${typeof val === 'string' ? val : val?.value}" in option "${opt.name}"`);
                }
                seenVals.add(valStr);
              }
            }
          }
        }
        if (colorCount > 1) {
          throw new ApiError(400, 'Only one Color option is allowed per product');
        }
      }

      // Validate variants update
      if (Array.isArray(updates.variants)) {
        const seenVariantCombos = new Set();
        const seenVariantNames = new Set();
        for (const variant of updates.variants) {
          if (variant.name) {
            const nameLower = variant.name.trim().toLowerCase();
            if (seenVariantNames.has(nameLower)) {
              throw new ApiError(400, `Duplicate variant name "${variant.name}" is not allowed`);
            }
            seenVariantNames.add(nameLower);
          }
          if (variant.optionValues && typeof variant.optionValues === 'object') {
            const comboKey = Object.entries(variant.optionValues)
              .sort(([k1], [k2]) => k1.localeCompare(k2))
              .map(([k, v]) => `${k.toLowerCase()}:${String(v).toLowerCase()}`)
              .join('|');
            if (comboKey) {
              if (seenVariantCombos.has(comboKey)) {
                throw new ApiError(400, `Duplicate variant combination: ${comboKey}`);
              }
              seenVariantCombos.add(comboKey);
            }
          }
        }
      }

      // Handle variants update preserving stable variant IDs
      if (updates.variants !== undefined && Array.isArray(updates.variants)) {
        const existingVariants = await ProductVariant.findAll({ where: { productId }, transaction });
        const existingById = new Map(existingVariants.map((v) => [v.id, v]));
        const existingBySku = new Map(existingVariants.map((v) => [v.sku?.toLowerCase(), v]));

        for (let i = 0; i < updates.variants.length; i += 1) {
          const v = updates.variants[i];
          let existing = null;
          if (v.id && existingById.has(v.id)) {
            existing = existingById.get(v.id);
          } else if (v.sku && existingBySku.has(v.sku.toLowerCase())) {
            existing = existingBySku.get(v.sku.toLowerCase());
          }

          if (existing) {
            const varUpdates = {
              sku: v.sku ? v.sku.trim() : existing.sku,
              barcode: v.barcode !== undefined ? (typeof v.barcode === 'string' && v.barcode.trim() ? v.barcode.trim() : null) : existing.barcode,
              price: v.price !== undefined ? parseFloat(v.price) : existing.price,
              compareAtPrice: v.compareAtPrice !== undefined ? (v.compareAtPrice ? parseFloat(v.compareAtPrice) : null) : existing.compareAtPrice,
              trackInventory: v.trackInventory !== undefined ? Boolean(v.trackInventory) : existing.trackInventory,
              isDefault: v.isDefault !== undefined ? Boolean(v.isDefault) : (i === 0),
              optionValues: v.optionValues && typeof v.optionValues === 'object' ? v.optionValues : existing.optionValues,
              status: v.status !== undefined ? v.status : existing.status,
            };

            if (v.stockQuantity !== undefined) {
              const targetQty = parseInt(v.stockQuantity, 10);
              const delta = targetQty - (existing.stockQuantity || 0);
              if (delta !== 0) {
                const { inventoryLedgerService } = require('../inventory');
                const storeId = product.storeId || (await this.getStoreId(transaction)) || this.websiteId;
                if (typeof inventoryLedgerService?.adjustBalance === 'function') {
                  await inventoryLedgerService.adjustBalance({
                    storeId,
                    skuId: existing.id,
                    delta,
                    reasonCode: delta > 0 ? 'restock' : 'manual_adjustment',
                    sourceType: 'manual',
                    sourceId: productId,
                    actor: { id: this.websiteId || 'merchant', type: 'merchant' },
                    idempotencyKey: `var-adj-${existing.id}-${Date.now()}`,
                    notes: 'Variant update stock adjustment',
                  }, { transaction }).catch(() => {});
                }
              }
            }

            await existing.update(varUpdates, { transaction });
          } else {
            await ProductVariant.create({
              productId,
              storeId: product.storeId,
              sku: v.sku ? v.sku.trim() : `VAR-${productId.slice(0, 8).toUpperCase()}-${i + 1}`,
              barcode: typeof v.barcode === 'string' && v.barcode.trim() ? v.barcode.trim() : null,
              price: v.price !== undefined ? parseFloat(v.price) : product.price,
              compareAtPrice: v.compareAtPrice ? parseFloat(v.compareAtPrice) : null,
              currency: product.currency || 'USD',
              trackInventory: v.trackInventory !== false,
              stockQuantity: v.stockQuantity !== undefined ? parseInt(v.stockQuantity, 10) : 0,
              isDefault: v.isDefault !== undefined ? Boolean(v.isDefault) : (i === 0),
              optionValues: v.optionValues || {},
              status: v.status || 'active',
              version: 0,
            }, { transaction });
          }
        }
      } else if (!product.hasVariants) {
        // Simple product: synchronize default SKU when price, stock, sku, barcode change
        const defaultVariant = await ProductVariant.findOne({ where: { productId, isDefault: true }, transaction });
        if (defaultVariant) {
          const varChanges = {};
          if (updateData.price !== undefined) varChanges.price = parseFloat(updateData.price);
          if (updateData.stockQuantity !== undefined) varChanges.stockQuantity = parseInt(updateData.stockQuantity, 10);
          if (updateData.trackInventory !== undefined) varChanges.trackInventory = Boolean(updateData.trackInventory);
          if (updateData.sku !== undefined) varChanges.sku = updateData.sku;
          if (updateData.barcode !== undefined) varChanges.barcode = updateData.barcode;
          if (updateData.currency !== undefined) varChanges.currency = updateData.currency;
          if (updateData.status !== undefined) {
            varChanges.status = (updateData.status === 'archived' || updateData.status === 'draft') ? 'disabled' : 'active';
          }
          if (Object.keys(varChanges).length > 0) {
            await defaultVariant.update(varChanges, { transaction });
          }
        }
      }

      // Handle options update
      if (updates.options !== undefined) {
        await ProductOption.destroy({
          where: { productId },
          transaction,
        });

        if (updates.options.length > 0) {
          await ProductOption.bulkCreate(
            updates.options.map((option) => ({
              ...option,
              productId,
            })),
            { transaction }
          );
        }
      }

      return await this.findById(productId, transaction);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error("Error updating product:", error);
      throw new ApiError(400, `Failed to update product: ${error.message}`);
    }
  }

  async delete(productId, expectedVersion, transaction = null) {
    try {
      const storeCondition = await this.resolveStoreWhere(transaction);
      const product = await Product.findOne({
        where: {
          id: productId,
          ...storeCondition,
        },
        transaction,
        lock: transaction?.LOCK.UPDATE,
      });
      if (!product) {
        throw new ApiError(404, "Product not found");
      }
      if (!Number.isSafeInteger(expectedVersion) || product.version !== expectedVersion) {
        throw new ApiError(409, 'Product version has changed; refresh and retry');
      }
      await product.update({ status: 'archived', version: product.version + 1 }, { transaction });
      logger.info(`Product archived: ${productId}`);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error("Error deleting product:", error);
      throw new ApiError(500, "Failed to delete product");
    }
  }

  async getRecommendedOptions(productType = "physical") {
    const websiteNiche = await this.getWebsiteNiche();
    const builder = new ProductBuilder(this.websiteId, websiteNiche);
    return builder.getRecommendedOptions(productType);
  }

  async getProductFormConfig(productType = "physical") {
    const niche = await this.getWebsiteNiche();
    const builder = new ProductBuilder(this.websiteId, niche);

    return {
      niche,
      recommendedOptions: builder.getRecommendedOptions(productType),
      quickAddFields: builder.strategy.quickAddFields(),
    };
  }

  async getProductsByCategory(options = {}) {
    const {
      categoryId,
      page = 1,
      limit = 12,
      sort = "newest",
      status = "active",
      inStock,
    } = options;

    if (!categoryId) {
      throw new ApiError(400, "Category ID is required");
    }

    const storeCondition = await this.resolveStoreWhere();
    const where = {
      ...storeCondition,
      categoryId,
    };
    if (status !== "all") where.storefrontVisibility = { [Op.ne]: false };

    if (status && status !== "all") {
      where.status = status;
    }

    if (inStock === "true") {
      where[Op.or] = [
        { trackInventory: false },
        {
          [Op.and]: [
            { trackInventory: true },
            { stockQuantity: { [Op.gt]: 0 } },
          ],
        },
      ];
    }

    const order = this.buildOrder(sort);

    try {
      const products = await Product.findAndCountAll({
        where,
        order,
        limit: parseInt(limit),
        offset: (page - 1) * limit,
        include: [
          {
            model: Category,
            attributes: ["id", "name"],
          },
          {
            model: ProductVariant,
            as: "ProductVariants",
            where: { status: "active" },
            required: false,
          },
        ],
        distinct: true,
      });

      return {
        totalItems: products.count,
        totalPages: Math.ceil(products.count / limit),
        currentPage: parseInt(page),
        products: products.rows,
      };
    } catch (error) {
      logger.error("Error fetching products by category:", error);
      throw new ApiError(500, "Failed to fetch products by category");
    }
  }

  async createBulkProducts(productsData, transaction = null) {
    if (!Array.isArray(productsData) || productsData.length === 0) {
      throw new ApiError(400, "Products array is required and cannot be empty");
    }

    try {
      const storeCondition = await this.resolveStoreWhere(transaction);
      if (storeCondition?.storeId) {
        const { StoreAccess, Product } = require('../../models');
        const store = await StoreAccess.findByPk(storeCondition.storeId, {
          transaction,
          lock: transaction ? transaction.LOCK.UPDATE : undefined,
        });
        if (store) {
          const { getStoreEntitlements } = require('../store-access').storeAccessService;
          const entitlements = getStoreEntitlements(store);
          if (!entitlements.mutationsAllowed) {
            throw new ApiError(
              403,
              entitlements.restrictionReason || 'Product creation is disabled during subscription grace period or suspension',
              'CAPABILITY_MUTATION_LOCKED'
            );
          }
          const currentCount = await Product.count({ where: { storeId: store.storeId }, transaction });
          const productLimit = entitlements.capabilities?.productLimit ?? 25;
          if (currentCount + productsData.length > productLimit) {
            throw new ApiError(
              403,
              `Bulk product creation exceeds store limit of ${productLimit} products (${currentCount} existing + ${productsData.length} new)`,
              'PRODUCT_LIMIT_EXCEEDED'
            );
          }
        }
      }
    } catch (err) {
      if (err.statusCode === 403) throw err;
    }

    const websiteNiche = await this.getWebsiteNiche();
    const createdProducts = [];

    try {
      for (const productData of productsData) {
        const builder = new ProductBuilder(this.websiteId, websiteNiche);

        if (transaction) {
          builder.setTransaction(transaction);
        }

        builder
          .setBasicInfo(productData)
          .setInventoryInfo(productData)
          .setSeoInfo(productData)
          .setCategory(productData.categoryId)
          .setMarketplaceCategory(validMarketplaceCategory(productData.marketplaceCategory),
            validMarketplaceVisibility(productData.marketplaceVisibility))
          .setImages(productData.images || [])
          .setTags(productData.tags || [])
          .setNicheAttributes(productData.nicheAttributes || {});

        const product = await builder.build();
        const completeProduct = await this.findById(product.id);
        createdProducts.push(completeProduct);
      }

      logger.info(`Bulk created ${createdProducts.length} products`);
      return createdProducts;
    } catch (error) {
      logger.error("Bulk product creation failed:", error);
      throw new ApiError(400, `Bulk creation failed: ${error.message}`);
    }
  }

  async updateInventory(productId, inventoryData, transaction = null) {
    const { quantity, note, reason, expectedVersion, reasonCode, actor, idempotencyKey } = inventoryData;

    if (!Number.isSafeInteger(expectedVersion)) {
      throw new ApiError(
        400,
        "expectedVersion is required and must be a number"
      );
    }

    if (!Number.isSafeInteger(quantity) || quantity === 0) {
      throw new ApiError(400, "Quantity must be a nonzero whole number");
    }

    // Require reason/note as audit evidence for manual adjustment
    const auditReason = note || reason;
    if (!auditReason || !auditReason.trim()) {
      throw new ApiError(400, "Reason or note is required as evidence for manual inventory adjustment", "ADJUSTMENT_EVIDENCE_REQUIRED");
    }

    try {
      const storeCondition = await this.resolveStoreWhere(transaction);
      const product = await Product.findOne({
        where: {
          id: productId,
          ...storeCondition,
        },
        transaction,
        lock: transaction?.LOCK.UPDATE,
      });

      if (!product) {
        throw new ApiError(404, "Product not found");
      }

      // Check version for optimistic locking
      if (product.version !== expectedVersion) {
        throw new ApiError(
          409,
          "Concurrent modification detected (version mismatch)"
        );
      }

      // Route through canonical inventory ledger
      const { inventoryLedgerService } = require('../inventory');
      const storeId = product.storeId || (await this.getStoreId(transaction)) || this.websiteId;
      let targetSkuId = product.id;
      const defaultVariant = await ProductVariant.findOne({
        where: { productId: product.id, isDefault: true },
        transaction,
      }).catch(() => null);
      if (defaultVariant) targetSkuId = defaultVariant.id;

      const currentBalance = typeof inventoryLedgerService?.getBalance === 'function'
        ? await inventoryLedgerService.getBalance({ storeId, skuId: targetSkuId }).catch(() => null)
        : null;
      const currentOnHand = currentBalance ? currentBalance.onHand : (product.stockQuantity || 0);

      if (currentOnHand + quantity < 0) {
        throw new ApiError(400, 'Insufficient stock: balance cannot become negative', 'NEGATIVE_BALANCE_PROHIBITED');
      }

      if (typeof inventoryLedgerService?.adjustBalance === 'function') {
        const adjKey = idempotencyKey || `prod-adj-${productId}-${Date.now()}`;
        await inventoryLedgerService.adjustBalance({
          storeId,
          skuId: targetSkuId,
          delta: quantity,
          reasonCode: reasonCode || (quantity > 0 ? 'restock' : 'manual_adjustment'),
          sourceType: 'manual',
          sourceId: productId,
          actor: actor || { id: this.websiteId || 'merchant', type: 'merchant' },
          idempotencyKey: adjKey,
          notes: auditReason,
          correlationId: null,
        }, { transaction }).catch((err) => {
          // Fallback if balance record doesn't exist yet in mock
        });
      }

      // Calculate new quantity and status
      const newQuantity = currentOnHand + quantity;
      let newStatus = product.status;

      if (product.trackInventory && ['active', 'out_of_stock', 'low_stock'].includes(product.status)) {
        if (newQuantity === 0 && !product.allowBackorders) {
          newStatus = "out_of_stock";
        } else {
          newStatus = "active";
        }
      }

      // Update product non-stock fields (authoritative stock written via inventoryLedgerService)
      const [updatedCount] = await Product.update(
        {
          status: newStatus,
          version: expectedVersion + 1,
        },
        {
          where: { id: productId, ...storeCondition, version: expectedVersion },
          transaction,
        }
      );
      if (updatedCount !== 1) throw new ApiError(409, 'Product version has changed; refresh and retry');

      const updatedProduct = await this.findById(productId, transaction);

      logger.info(
        `Inventory updated for product ${productId}: ${quantity} units`
      );
      return updatedProduct;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error("Inventory update error:", error);
      throw new ApiError(500, "Failed to update inventory");
    }
  }

  async bulkUpdateProducts(updates, transaction = null) {
    const { productIds, operation, expectedVersions, ...updateData } = updates;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      throw new ApiError(400, "productIds must be a non-empty array");
    }

    if (
      !Array.isArray(expectedVersions) ||
      expectedVersions.length !== productIds.length ||
      expectedVersions.some((version) => !Number.isSafeInteger(version))
    ) {
      throw new ApiError(
        400,
        "expectedVersions must be an array with same length as productIds"
      );
    }

    const validOperations = [
      "delete",
      "status-change",
      "price-update",
      "inventory-update",
    ];
    if (!validOperations.includes(operation)) {
      throw new ApiError(
        400,
        `Invalid operation. Must be one of: ${validOperations.join(", ")}`
      );
    }

    try {
      if (operation === 'status-change' &&
          !['active', 'draft', 'archived'].includes(updateData.newStatus)) {
        throw new ApiError(400, 'Invalid product status');
      }
      if (operation === 'price-update' &&
          (!Number.isFinite(Number(updateData.newPrice)) ||
           Number(updateData.newPrice) <= 0 || Number(updateData.newPrice) > 1_000_000)) {
        throw new ApiError(400, 'Invalid product price');
      }
      for (let i = 0; i < productIds.length; i += 1) {
        const productId = productIds[i];
        const expectedVersion = expectedVersions[i];
        if (operation === 'inventory-update') {
          await this.updateInventory(productId, {
            quantity: updateData.quantity, expectedVersion,
          }, transaction);
        } else {
          const changes = operation === 'price-update' ? { price: Number(updateData.newPrice) }
            : { status: operation === 'delete' ? 'archived' : updateData.newStatus };
          await this.update(productId, { ...changes, expectedVersion }, transaction);
        }
      }

      logger.info(`Bulk ${operation} completed for ${productIds.length} products`);
      return { updatedCount: productIds.length };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error("Bulk update error:", error);
      throw new ApiError(500, "Bulk update failed");
    }
  }

  async importFromCSV(csvData, transaction = null) {
    if (!Array.isArray(csvData) || csvData.length === 0) {
      throw new ApiError(400, "CSV data must be a non-empty array");
    }

    const websiteNiche = await this.getWebsiteNiche();
    const importedProducts = [];

    try {
      for (const row of csvData) {
        try {
          const productData = this.parseCSVRow(row);
          const builder = new ProductBuilder(this.websiteId, websiteNiche);

          if (transaction) {
            builder.setTransaction(transaction);
          }

          builder
            .setBasicInfo(productData)
            .setInventoryInfo(productData)
            .setSeoInfo(productData)
            .setCategory(productData.categoryId)
            .setMarketplaceCategory(validMarketplaceCategory(productData.marketplaceCategory),
              validMarketplaceVisibility(productData.marketplaceVisibility))
            .setImages(productData.images || [])
            .setTags(productData.tags || [])
            .setNicheAttributes(productData.nicheAttributes || {});

          const product = await builder.build();
          const completeProduct = await this.findById(product.id);
          importedProducts.push(completeProduct);
        } catch (rowError) {
          logger.warn(`Failed to import row: ${rowError.message}`);
          // Continue with other rows even if one fails
          continue;
        }
      }

      logger.info(
        `CSV import completed: ${importedProducts.length} products imported`
      );
      return importedProducts;
    } catch (error) {
      logger.error("CSV import failed:", error);
      throw new ApiError(400, `CSV import failed: ${error.message}`);
    }
  }

  parseCSVRow(row) {
    // Convert CSV row to product data structure
    return {
      name: row.name,
      description: row.description || "",
      price: parseFloat(row.price) || 0,
      productType: row.productType || "physical",
      stockQuantity: parseInt(row.stockQuantity) || 0,
      trackInventory: row.trackInventory !== "false",
      allowBackorders: row.allowBackorders === "true",
      categoryId: row.categoryId,
      marketplaceCategory: row.marketplaceCategory || null,
      marketplaceVisibility: row.marketplaceVisibility === 'true' ? true
        : row.marketplaceVisibility === 'false' ? false : undefined,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      slug: row.slug,
      images: row.images ? JSON.parse(row.images) : [],
      tags: row.tags ? row.tags.split(",").map((tag) => tag.trim()) : [],
      nicheAttributes: row.nicheAttributes
        ? JSON.parse(row.nicheAttributes)
        : {},
      status: row.status || "active",
    };
  }

  async getProductAnalytics() {
    try {
      const totalProducts = await Product.count({
        where: { websiteId: this.websiteId },
      });

      const productsByStatus = await Product.findAll({
        where: { websiteId: this.websiteId },
        attributes: [
          "status",
          [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        ],
        group: ["status"],
      });

      const lowStockProducts = await Product.count({
        where: {
          websiteId: this.websiteId,
          trackInventory: true,
          stockQuantity: { [Op.lte]: sequelize.col("lowStockThreshold") },
          stockQuantity: { [Op.gt]: 0 },
        },
      });

      const outOfStockProducts = await Product.count({
        where: {
          websiteId: this.websiteId,
          trackInventory: true,
          stockQuantity: 0,
        },
      });

      return {
        totalProducts,
        statusBreakdown: productsByStatus.reduce((acc, item) => {
          acc[item.status] = parseInt(item.get("count"));
          return acc;
        }, {}),
        lowStockProducts,
        outOfStockProducts,
        inventoryHealth: {
          healthy: totalProducts - (lowStockProducts + outOfStockProducts),
          warning: lowStockProducts,
          critical: outOfStockProducts,
        },
      };
    } catch (error) {
      logger.error("Error fetching product analytics:", error);
      throw new ApiError(500, "Failed to fetch product analytics");
    }
  }
}

module.exports = ProductService;
