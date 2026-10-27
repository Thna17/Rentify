const { Op } = require('sequelize');
const { sequelize } = require('../../config/db');
const {
  Product, ProductVariant, StoreAccess, StoreDeliveryPolicy, WebsiteData, ProductReview,
} = require('../../models');
const { canonicalCategory } = require('../../config/marketplaceTaxonomy');

/**
 * Real average rating + review count per product, one query for the whole
 * page. Product cards used to show a hardcoded 4.8/12 on every single
 * listing regardless of actual reviews — this replaces that with the truth,
 * and a product with no reviews correctly shows none rather than a fake one.
 */
async function ratingSummariesFor(productIds) {
  if (!productIds.length) return new Map();
  const rows = await ProductReview.findAll({
    where: { productId: { [Op.in]: productIds }, status: 'published' },
    attributes: [
      'productId',
      [sequelize.fn('AVG', sequelize.col('rating')), 'average'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
    ],
    group: ['productId'],
    raw: true,
  });
  const map = new Map();
  for (const row of rows) {
    map.set(row.productId, {
      rating: Math.round(Number(row.average) * 10) / 10,
      reviewCount: Number(row.count),
    });
  }
  return map;
}

function fail(message, statusCode = 400, code = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  throw error;
}

function text(value, length, field) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > length) {
    fail(`${field} is required and must be ${length} characters or fewer`);
  }
  return value.trim();
}

function money(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || number > 1_000_000) fail(`Invalid ${field}`);
  return number.toFixed(2);
}

function stock(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 1_000_000) fail('Invalid stock quantity');
  return value;
}

function visibility(value) {
  if (value !== null && value !== undefined && typeof value !== 'boolean') {
    fail('Marketplace visibility must be true, false, or null');
  }
  return value ?? null;
}

function slugify(value) {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100);
}

async function uniqueSlug(storeId, name, transaction) {
  const base = slugify(name) || 'product';
  for (let suffix = 1; suffix < 100; suffix += 1) {
    const slug = suffix === 1 ? base : `${base}-${suffix}`;
    const existing = await Product.findOne({ where: { storeId, slug }, attributes: ['id'], transaction });
    if (!existing) return slug;
  }
  fail('Could not allocate a product slug', 409);
}

function validateImages(value, storeId) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 10 || value.some((image) =>
    !image || typeof image.url !== 'string' || !/^https:\/\//i.test(image.url) || image.url.length > 2048)) {
    fail('Images must be up to 10 HTTPS URLs');
  }
  if (storeId) {
    for (const image of value) {
      const match = image.url.match(/rentify\/stores\/([a-zA-Z0-9-]+)\//i);
      if (match && match[1] !== storeId) {
        fail('Cross-store media reference prohibited', 403);
      }
    }
  }
  return value.map((image) => ({
    url: image.url,
    alt: typeof image.alt === 'string' ? image.alt.trim().slice(0, 240) : '',
  }));
}

function defaultSku(name) {
  const clean = String(name || 'SKU')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 16);
  return `${clean || 'SKU'}-${Date.now().toString(36).toUpperCase()}`;
}

function sku(value) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 120) {
    fail('Every SKU is required and must be 120 characters or fewer');
  }
  return value.trim().toUpperCase();
}

function variants(value, fallback) {
  const source = value === undefined ? [{
    sku: fallback.sku,
    price: fallback.price,
    stockQuantity: fallback.stockQuantity,
    optionValues: {},
    status: 'active',
  }] : value;
  if (!Array.isArray(source) || source.length < 1 || source.length > 100) {
    fail('Add between 1 and 100 SKUs');
  }
  const seen = new Set();
  return source.map((entry, index) => {
    if (!entry || typeof entry !== 'object') fail(`Invalid SKU at row ${index + 1}`);
    const normalizedSku = sku(entry.sku);
    if (seen.has(normalizedSku)) fail(`Duplicate SKU ${normalizedSku}`, 409, 'SKU_DUPLICATE');
    seen.add(normalizedSku);
    const optionValues = entry.optionValues === undefined ? {} : entry.optionValues;
    if (!optionValues || Array.isArray(optionValues) || typeof optionValues !== 'object' ||
        Object.keys(optionValues).length > 10 || Object.values(optionValues).some((item) =>
          typeof item !== 'string' || !item.trim() || item.trim().length > 120)) {
      fail(`Invalid options for SKU ${normalizedSku}`);
    }
    const status = entry.status || 'active';
    if (!['active', 'disabled'].includes(status)) fail(`Invalid status for SKU ${normalizedSku}`);
    return {
      id: entry.id || null,
      expectedVersion: entry.expectedVersion,
      sku: normalizedSku,
      price: money(entry.price ?? fallback.price, 'SKU price'),
      stockQuantity: stock(Number(entry.stockQuantity ?? fallback.stockQuantity)),
      optionValues: Object.fromEntries(Object.entries(optionValues).map(([key, item]) => [
        String(key).trim().slice(0, 80), item.trim(),
      ])),
      status,
    };
  });
}

function category(value) {
  const result = canonicalCategory(value);
  if (!result) fail('Choose a valid marketplace category');
  return result;
}

function prepareCreate(store, input) {
  const name = text(input.name, 200, 'Name');
  const price = money(input.price, 'price');
  const marketplaceCategory = category(input.marketplaceCategory);
  const fallbackStock = stock(input.stockQuantity);
  const status = input.status || 'draft';
  if (!['active', 'draft'].includes(status)) fail('Invalid product status');
  const description = typeof input.description === 'string' ? input.description.trim().slice(0, 4000) : '';
  const images = validateImages(input.images, store.storeId);
  const fallbackSku = input.sku !== undefined ? sku(input.sku) : defaultSku(name);
  const preparedVariants = variants(input.variants, {
    price, stockQuantity: fallbackStock, sku: fallbackSku,
  });
  const stockQuantity = preparedVariants.filter((entry) => entry.status === 'active')
    .reduce((sum, entry) => sum + entry.stockQuantity, 0);
  const canonicalPrice = preparedVariants.reduce((minimum, entry) =>
    Math.min(minimum, Number(entry.price)), Number.POSITIVE_INFINITY).toFixed(2);
  if (status === 'active' && stockQuantity === 0) fail('Add stock before publishing the product');
  return {
    name, price: canonicalPrice, marketplaceCategory, stockQuantity, status, description, images,
    marketplaceVisibility: visibility(input.marketplaceVisibility),
    variants: preparedVariants,
  };
}

async function createInsideTransaction(store, input, transaction) {
  const { name, price, marketplaceCategory, stockQuantity, status, description, images } = input;
  // 1. Atomically lock store record to serialize concurrent product creations
    const storeAccess = await StoreAccess.findByPk(store.storeId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const { getStoreEntitlements } = require('../store-access').storeAccessService;
    const entitlements = getStoreEntitlements(storeAccess || store);

    // 2. Enforce mutation lock during grace period or suspension
    if (!entitlements.mutationsAllowed) {
      fail(
        entitlements.restrictionReason ||
          'Product creation is disabled during subscription grace period or suspension',
        403,
        'CAPABILITY_MUTATION_LOCKED'
      );
    }

    // 3. Atomically enforce product limit
    const currentProductCount = await Product.count({
      where: { storeId: store.storeId },
      transaction,
    });
    const productLimit = entitlements.capabilities?.productLimit ?? 25;
    if (currentProductCount >= productLimit) {
      fail(
        `Store has reached the product limit of ${productLimit} for the ${entitlements.displayName || 'current'} plan`,
        403,
        'PRODUCT_LIMIT_EXCEEDED'
      );
    }

    const website = store.websiteId ? await WebsiteData.findOne({
      where: { websiteId: store.websiteId, storeId: store.storeId }, transaction,
    }) : null;
    if (store.websiteId && !website) fail('Website projection is not ready', 409);
    const websiteNiche = website?.niche || 'ecommerce';
    const productType = {
      restaurant: 'food', cafe: 'beverage', fashion: 'clothing',
      skincare: 'cleanser', electronics: 'device', grocery: 'fresh',
    }[websiteNiche] || 'physical';
    const product = await Product.create({
    storeId: store.storeId,
    websiteId: store.websiteId || null,
    websiteNiche,
    productType,
    name, description, price, marketplaceCategory, images,
    marketplaceVisibility: input.marketplaceVisibility,
    stockQuantity, status,
    slug: await uniqueSlug(store.storeId, name, transaction),
    }, { transaction });
    if (!input.skipVariantCreation) {
      await Promise.all(input.variants.map((variant) => ProductVariant.create({
        productId: product.id,
        sku: variant.sku,
        price: variant.price,
        stockQuantity: variant.stockQuantity,
        optionValues: variant.optionValues,
        status: variant.status,
      }, { transaction })));
    }
    return Product.findByPk(product.id, {
      include: [{ model: ProductVariant, as: 'ProductVariants' }], transaction,
    });
}

async function create(store, input, options = {}) {
  // Keep request validation outside the transaction so malformed or
  // cross-Store input is rejected before a database connection is acquired.
  const prepared = { ...prepareCreate(store, input), skipVariantCreation: options.skipVariantCreation === true };
  if (options.transaction) return createInsideTransaction(store, prepared, options.transaction);
  return sequelize.transaction((transaction) => createInsideTransaction(store, prepared, transaction));
}

async function listOwn(storeId, query = {}) {
  const page = Math.max(1, Math.min(100_000, Number.parseInt(query.page, 10) || 1));
  const limit = Math.max(1, Math.min(60, Number.parseInt(query.limit, 10) || 20));
  const { count, rows } = await Product.findAndCountAll({
    where: { storeId }, order: [['createdAt', 'DESC']],
    include: [{ model: ProductVariant, as: 'ProductVariants' }],
    distinct: true, offset: (page - 1) * limit, limit,
  });
  return { products: rows, total: count, page, limit };
}

async function getOwn(storeId, productId) {
  const product = await Product.findOne({
    where: { id: productId, storeId },
    include: [{ model: ProductVariant, as: 'ProductVariants' }],
  });
  if (!product) fail('Product not found', 404);
  return product;
}

async function update(storeId, productId, input) {
  return sequelize.transaction(async (transaction) => {
    const product = await Product.findOne({
      where: { id: productId, storeId }, transaction, lock: transaction.LOCK.UPDATE,
    });
    if (!product) fail('Product not found', 404);
    if (!Number.isSafeInteger(input.expectedVersion) || input.expectedVersion !== product.version) {
      fail('Product version has changed; refresh and retry', 409);
    }
    const changes = {};
    let preparedVariants = null;
    if (input.name !== undefined) {
      changes.name = text(input.name, 200, 'Name');
      if (changes.name !== product.name) changes.slug = await uniqueSlug(storeId, changes.name, transaction);
    }
    if (input.description !== undefined) {
      if (typeof input.description !== 'string' || input.description.length > 4000) fail('Invalid description');
      changes.description = input.description.trim();
    }
    if (input.price !== undefined) changes.price = money(input.price, 'price');
    if (input.stockQuantity !== undefined) {
      changes.stockQuantity = stock(input.stockQuantity);
      if (changes.stockQuantity > 0 && product.status === 'out_of_stock' && input.status === undefined) {
        changes.status = 'active';
      } else if (changes.stockQuantity === 0 && product.status === 'active' && input.status === undefined) {
        changes.status = 'out_of_stock';
      }
    }
    if (input.marketplaceCategory !== undefined) changes.marketplaceCategory = category(input.marketplaceCategory);
    if (input.marketplaceVisibility !== undefined) changes.marketplaceVisibility = visibility(input.marketplaceVisibility);
    if (input.images !== undefined) changes.images = validateImages(input.images, storeId);
    if (input.status !== undefined) {
      if (!['active', 'draft', 'archived', 'out_of_stock'].includes(input.status)) fail('Invalid product status');
      changes.status = input.status;
    }
    if (input.variants !== undefined) {
      preparedVariants = variants(input.variants, {
        price: changes.price ?? product.price,
        stockQuantity: changes.stockQuantity ?? product.stockQuantity,
      });
      const existing = await ProductVariant.findAll({
        where: { productId }, transaction, lock: transaction.LOCK.UPDATE,
      });
      const byId = new Map(existing.map((entry) => [entry.id, entry]));
      for (const variant of preparedVariants) {
        if (!variant.id) continue;
        const current = byId.get(variant.id);
        if (!current) fail('SKU does not belong to this product', 403, 'SKU_STORE_MISMATCH');
        if (!Number.isSafeInteger(variant.expectedVersion) || variant.expectedVersion !== current.version) {
          fail('SKU version has changed; refresh and retry', 409, 'SKU_VERSION_CONFLICT');
        }
      }
      const totalStock = preparedVariants
        .filter((entry) => entry.status === 'active')
        .reduce((sum, entry) => sum + entry.stockQuantity, 0);
      changes.stockQuantity = totalStock;
      changes.price = preparedVariants.reduce((minimum, entry) =>
        Math.min(minimum, Number(entry.price)), Number.POSITIVE_INFINITY).toFixed(2);
    }
    if ((changes.status ?? product.status) === 'active' &&
        (changes.stockQuantity ?? product.stockQuantity) === 0) {
      fail('Add stock before publishing the product');
    }
    if (!Object.keys(changes).length && !preparedVariants) fail('No product changes provided');
    const updated = await product.update({ ...changes, version: product.version + 1 }, { transaction });
    if (preparedVariants) {
      const retainedIds = [];
      for (const variant of preparedVariants) {
        if (variant.id) {
          retainedIds.push(variant.id);
          const current = await ProductVariant.findByPk(variant.id, { transaction });
          await current.update({
            sku: variant.sku, price: variant.price, stockQuantity: variant.stockQuantity,
            optionValues: variant.optionValues, status: variant.status, version: current.version + 1,
          }, { transaction });
        } else {
          const created = await ProductVariant.create({
            productId, sku: variant.sku, price: variant.price,
            stockQuantity: variant.stockQuantity, optionValues: variant.optionValues,
            status: variant.status,
          }, { transaction });
          retainedIds.push(created.id);
        }
      }
      if (input.replaceVariants === true) {
        await ProductVariant.destroy({
          where: { productId, id: { [Op.notIn]: retainedIds } }, transaction,
        });
      }
    }
    return Product.findByPk(updated.id, {
      include: [{ model: ProductVariant, as: 'ProductVariants' }], transaction,
    });
  });
}

function eligibleProductWhere(query = {}) {
  const where = {
    status: 'active', marketplaceCategory: { [Op.ne]: null },
    [Op.or]: [
      { marketplaceVisibility: true },
      { marketplaceVisibility: null, '$storeAccess.marketplaceEnabled$': true },
    ],
  };
  const requestedCategory = query.category ? canonicalCategory(query.category) : null;
  if (query.category && !requestedCategory) fail('Unknown marketplace category');
  if (requestedCategory) where.marketplaceCategory = requestedCategory;
  if (query.storeId) where.storeId = query.storeId;
  if (query.search) {
    const search = String(query.search).trim().slice(0, 120).replace(/[\\%_]/g, '\\$&');
    if (search) where.name = { [Op.like]: `%${search}%` };
  }
  return where;
}

const eligibleStore = {
  model: StoreAccess, as: 'storeAccess', required: true,
  where: {
    status: 'active', marketplaceApprovalStatus: 'approved',
    marketplaceEntitlement: 'pilot',
    needsCategoryReview: false,
  },
  attributes: ['storeId', 'primaryCategory'],
  include: [{ model: StoreDeliveryPolicy, as: 'deliveryPolicy', required: false, attributes: [] }],
};

function publicProduct(product, ratingSummary) {
  return {
    id: product.id, storeId: product.storeId, name: product.name,
    slug: product.slug, description: product.description,
    price: product.price, compareAtPrice: product.compareAtPrice,
    category: product.marketplaceCategory,
    images: product.images, stockQuantity: product.stockQuantity,
    status: product.status,
    // Colour/finish variants, e.g. { variants: [{ label, url }] }, set by
    // sellers who list photos per colour. Optional — most products have none.
    variants: Array.isArray(product.nicheAttributes?.variants) ? product.nicheAttributes.variants : [],
    productVariants: (product.ProductVariants || []).map((variant) => ({
      id: variant.id,
      productId: product.id,
      sku: variant.sku,
      price: variant.price,
      compareAtPrice: variant.compareAtPrice,
      stockQuantity: variant.stockQuantity,
      optionValues: variant.optionValues,
      status: variant.status,
      version: variant.version,
    })),
    // Real average + count from ProductReview. No reviews yet → 0/0, not a
    // made-up number — the frontend shows "No reviews" in that case.
    rating: ratingSummary?.rating ?? 0,
    reviewCount: ratingSummary?.reviewCount ?? 0,
  };
}

async function listPublic(query = {}) {
  const page = Math.max(1, Math.min(100_000, Number.parseInt(query.page, 10) || 1));
  const limit = Math.max(1, Math.min(60, Number.parseInt(query.limit, 10) || 20));
  const where = eligibleProductWhere(query);
  const { count, rows } = await Product.findAndCountAll({
    where, include: [eligibleStore, {
      model: ProductVariant, as: 'ProductVariants', required: false,
      where: { status: 'active' },
    }], distinct: true, subQuery: false,
    // Sellers' own uploaded (Cloudinary) photos outrank generic stock/demo
    // images of the same product, so a mismatched stock photo never sits
    // above a real one for the same listing.
    order: [
      [sequelize.literal("(JSON_EXTRACT(images, '$[0].url') LIKE '%res.cloudinary.com%')"), 'DESC'],
      ['createdAt', 'DESC'],
    ],
    offset: (page - 1) * limit, limit,
  });
  const ratings = await ratingSummariesFor(rows.map((row) => row.id));
  const products = rows.map((row) => publicProduct(row, ratings.get(row.id)));
  return { products, total: count, page, limit };
}

async function getPublic(productId) {
  const product = await Product.findOne({
    where: { id: productId, ...eligibleProductWhere() },
    include: [eligibleStore, {
      model: ProductVariant, as: 'ProductVariants', required: false,
      where: { status: 'active' },
    }],
  });
  if (!product) fail('Product not found', 404);
  const ratings = await ratingSummariesFor([product.id]);
  return publicProduct(product, ratings.get(product.id));
}

module.exports = { create, listOwn, getOwn, update, listPublic, getPublic, eligibleProductWhere, publicProduct };
