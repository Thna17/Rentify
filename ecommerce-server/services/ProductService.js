// services/ProductService.js
const {
  Product,
  ProductVariant,
  ProductOption,
  Category,
  WebsiteData,
} = require("../models");
const { Op } = require("sequelize");
const ProductBuilder = require("../core/product/builders/ProductBuilder");
const StrategyFactory = require("../core/product/factories/StrategyFactory");
const { logger } = require("../utils/logger");
const { ApiError } = require("../utils/ApiError");

class ProductService {
  constructor(websiteId) {
    this.websiteId = websiteId;
  }

  async getWebsiteNiche() {
    const website = await WebsiteData.findOne({
      where: { id: this.websiteId },
      attributes: ["niche"],
    });
    return website ? website.niche : "ecommerce";
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

    const where = { websiteId: this.websiteId };
    const include = [
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

async findById(productId, transaction = null) {
  try {
    const queryOptions = {
      where: {
        id: productId,
        websiteId: this.websiteId,
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
      const product = await Product.findOne({
        where: {
          websiteId: this.websiteId,
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

  const builder = new ProductBuilder(this.websiteId, websiteNiche);

  if (transaction) {
    builder.setTransaction(transaction);
  }

  try {
    builder
      .setBasicInfo(productData)
      .setInventoryInfo(productData)
      .setSeoInfo(productData)
      .setCategory(productData.categoryId)
      .setImages(productData.images)
      .setTags(productData.tags)
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
      const product = await this.findById(productId);

      const updateData = { ...updates };
      delete updateData.variants;
      delete updateData.options;

      await product.update(updateData, { transaction });

      // Handle variants update
      if (updates.variants !== undefined) {
        await ProductVariant.destroy({
          where: { productId },
          transaction,
        });

        if (updates.variants.length > 0) {
          await ProductVariant.bulkCreate(
            updates.variants.map((variant) => ({
              ...variant,
              productId,
            })),
            { transaction }
          );
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

      return await this.findById(productId);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error("Error updating product:", error);
      throw new ApiError(400, `Failed to update product: ${error.message}`);
    }
  }

  async delete(productId, expectedVersion, transaction = null) {
    try {
      const product = await Product.findOne({
        where: {
          id: productId,
          websiteId: this.websiteId,
          version: expectedVersion,
        },
        transaction,
      });
      if (!product) {
        throw new ApiError(404, "Product not found or version mismatch");
      }

      await product.destroy({ transaction });
      logger.info(`Product deleted: ${productId}`);
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

    const where = {
      websiteId: this.websiteId,
      categoryId,
    };

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
    const { quantity, note, expectedVersion } = inventoryData;

    if (expectedVersion === undefined || typeof expectedVersion !== "number") {
      throw new ApiError(
        400,
        "expectedVersion is required and must be a number"
      );
    }

    const quantityInt = parseInt(quantity, 10);
    if (isNaN(quantityInt)) {
      throw new ApiError(400, "Quantity must be a valid number");
    }

    try {
      const product = await Product.findOne({
        where: {
          id: productId,
          websiteId: this.websiteId,
        },
        transaction,
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

      // Calculate new quantity and status
      const newQuantity = product.stockQuantity + quantityInt;
      let newStatus = product.status;

      if (product.trackInventory) {
        if (newQuantity <= 0 && !product.allowBackorders) {
          newStatus = "out_of_stock";
        } else if (
          newQuantity > 0 &&
          newQuantity <= product.lowStockThreshold
        ) {
          newStatus = "low_stock";
        } else if (newQuantity > product.lowStockThreshold) {
          newStatus = "active";
        }
      }

      // Update product
      await Product.update(
        {
          stockQuantity: newQuantity,
          status: newStatus,
          version: expectedVersion + 1,
        },
        {
          where: { id: productId },
          transaction,
        }
      );

      const updatedProduct = await this.findById(productId);

      logger.info(
        `Inventory updated for product ${productId}: ${quantityInt} units`
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
      expectedVersions.length !== productIds.length
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
      let updateCount = 0;
      const where = {
        id: { [Op.in]: productIds },
        websiteId: this.websiteId,
      };

      switch (operation) {
        case "delete":
          updateCount = await Product.destroy({ where, transaction });
          break;

        case "status-change":
          if (!updateData.newStatus) {
            throw new ApiError(
              400,
              "newStatus is required for status-change operation"
            );
          }
          updateCount = await Product.update(
            { status: updateData.newStatus },
            { where, transaction }
          );
          break;

        case "price-update":
          if (updateData.newPrice === undefined) {
            throw new ApiError(
              400,
              "newPrice is required for price-update operation"
            );
          }
          updateCount = await Product.update(
            { price: updateData.newPrice },
            { where, transaction }
          );
          break;

        case "inventory-update":
          if (updateData.quantity === undefined) {
            throw new ApiError(
              400,
              "quantity is required for inventory-update operation"
            );
          }
          // For inventory updates, we need to handle each product individually
          // due to version checking and status calculations
          for (let i = 0; i < productIds.length; i++) {
            const productId = productIds[i];
            const expectedVersion = expectedVersions[i];

            await this.updateInventory(
              productId,
              {
                quantity: updateData.quantity,
                expectedVersion,
              },
              transaction
            );
          }
          updateCount = productIds.length;
          break;
      }

      logger.info(`Bulk ${operation} completed for ${updateCount} products`);
      return { updatedCount: updateCount };
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
