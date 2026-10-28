const { Op } = require('sequelize');
const { sequelize } = require('../../config/db');
const {
  Product, ProductOption, ProductVariant, StoreAccess, StoreDeliveryPolicy, WebsiteData, ProductReview,
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

function normalizeBarcode(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') fail('Barcode must be a string');
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 100) fail('Barcode must be 100 characters or fewer');
  return trimmed;
}

function normalizeSku(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== 'string') fail('SKU must be a string');
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (trimmed.length > 100) fail('SKU must be 100 characters or fewer');
  return trimmed.toUpperCase();
}

function normalizeCurrency(value) {
  if (value === null || value === undefined) return 'USD';
  const trimmed = String(value).trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(trimmed)) fail('Currency must be a valid 3-letter code (e.g. USD, KHR)');
  return trimmed;
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

function validateImages(images, storeId) {
  if (images === undefined) return [];
  if (!Array.isArray(images)) fail('Images must be an array');
  if (images.length > 8) fail('Maximum 8 images allowed');
  return images.map((image, index) => {
    if (typeof image === 'string') {
      const url = image.trim();
      if (!/^https?:\/\/.+/.test(url)) fail(`Image ${index + 1} has an invalid URL`);
      if (storeId) {
        const match = url.match(/rentify\/stores\/([a-zA-Z0-9-]+)\//i);
        if (match && match[1] !== storeId) {
          fail('Cross-store media reference prohibited', 403);
        }
      }
      return { url };
    }
    if (!image || typeof image !== 'object') fail(`Image ${index + 1} is invalid`);
    const url = typeof image.url === 'string' ? image.url.trim() : '';
    if (!/^https?:\/\/.+/.test(url)) fail(`Image ${index + 1} has an invalid URL`);
    if (image.storeId && image.storeId !== storeId) fail('Images must belong to the store', 403);
    if (storeId) {
      const match = url.match(/rentify\/stores\/([a-zA-Z0-9-]+)\//i);
      if (match && match[1] !== storeId) {
        fail('Cross-store media reference prohibited', 403);
      }
    }
    return { url, publicId: image.publicId || null, storeId: image.storeId || storeId };
  });
}

function sku(value) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 64) {
    fail('SKU is required and must be 64 characters or fewer');
  }
  return value.trim().toUpperCase();
}

function defaultSku(name) {
  return `${slugify(name).slice(0, 20).toUpperCase() || 'SKU'}-${Date.now().toString(36).toUpperCase()}`;
}

function variants(input, fallback = {}) {
  if (!Array.isArray(input) || input.length === 0) {
    return [{
      sku: fallback.sku || defaultSku('default'),
      barcode: fallback.barcode || null,
      price: fallback.price,
      stockQuantity: fallback.stockQuantity ?? 0,
      status: 'active',
      isDefault: true,
    }];
  }
  return input.map((variant, index) => {
    if (!variant || typeof variant !== 'object') fail(`Variant ${index + 1} is invalid`);
    const status = variant.status || 'active';
    if (!['active', 'draft'].includes(status)) fail(`Variant ${index + 1} has an invalid status`);
    return {
      ...(variant.id ? { id: variant.id } : {}),
      ...(variant.expectedVersion !== undefined ? { expectedVersion: variant.expectedVersion } : {}),
      sku: sku(variant.sku),
      barcode: variant.barcode ? normalizeBarcode(variant.barcode) : null,
      price: money(variant.price ?? fallback.price, `variant ${index + 1} price`),
      compareAtPrice: variant.compareAtPrice ? money(variant.compareAtPrice, 'variant compareAtPrice') : null,
      stockQuantity: stock(variant.stockQuantity ?? fallback.stockQuantity ?? 0),
      optionValues: Object.fromEntries(Object.entries(variant.optionValues || {}).map(([key, value]) => [
        String(key).trim().slice(0, 50),
        String(value).trim().slice(0, 50),
      ])),
      status,
      isDefault: Boolean(variant.isDefault),
    };
  });
}

function category(value) {
  const result = canonicalCategory(value);
  if (!result) fail('Choose a valid marketplace category');
  return result;
}

async function checkSkuUniqueness(storeId, skuValue, excludeVariantId = null, transaction = null) {
  if (!skuValue) return;
  const tx = (transaction && typeof transaction.commit === 'function') ? transaction : undefined;
  const where = { storeId, sku: skuValue };
  if (excludeVariantId) where.id = { [Op.ne]: excludeVariantId };
  const existing = await ProductVariant.findOne({ where, attributes: ['id', 'sku'], transaction: tx });
  if (existing) {
    fail(`Duplicate SKU identifier "${skuValue}" within store`, 409, 'DUPLICATE_SKU');
  }
}

async function checkBarcodeUniqueness(storeId, barcodeValue, excludeVariantId = null, transaction = null) {
  if (!barcodeValue) return;
  const tx = (transaction && typeof transaction.commit === 'function') ? transaction : undefined;
  const where = { storeId, barcode: barcodeValue };
  if (excludeVariantId) where.id = { [Op.ne]: excludeVariantId };
  const existing = await ProductVariant.findOne({ where, attributes: ['id', 'barcode'], transaction: tx });
  if (existing) {
    fail(`Duplicate barcode "${barcodeValue}" within store`, 409, 'DUPLICATE_BARCODE');
  }
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
  const currency = normalizeCurrency(input.currency);
  const barcode = normalizeBarcode(input.barcode);
  const hasVariants = Array.isArray(input.variants) && input.variants.length > 0;
  const fallbackSku = input.sku !== undefined ? sku(input.sku) : defaultSku(name);
  const preparedVariants = variants(input.variants, {
    price, stockQuantity: fallbackStock, sku: fallbackSku, barcode,
  });

  // Validate duplicate SKUs / barcodes in payload
  const seenSkus = new Set();
  const seenBarcodes = new Set();
  for (const v of preparedVariants) {
    const vSku = v.sku.toUpperCase();
    if (seenSkus.has(vSku)) {
      fail(`Duplicate SKU "${v.sku}" in payload`, 409, 'DUPLICATE_SKU');
    }
    seenSkus.add(vSku);
    if (v.barcode) {
      const vBc = v.barcode.toUpperCase();
      if (seenBarcodes.has(vBc)) {
        fail(`Duplicate barcode "${v.barcode}" in payload`, 409, 'DUPLICATE_BARCODE');
      }
      seenBarcodes.add(vBc);
    }
  }

  const stockQuantity = preparedVariants.filter((entry) => entry.status === 'active')
    .reduce((sum, entry) => sum + entry.stockQuantity, 0);
  const canonicalPrice = preparedVariants.reduce((minimum, entry) =>
    Math.min(minimum, Number(entry.price)), Number.POSITIVE_INFINITY).toFixed(2);
  if (status === 'active' && stockQuantity === 0) fail('Add stock before publishing the product');
  return {
    name, price: canonicalPrice, marketplaceCategory, stockQuantity, status, description, images,
    currency, barcode, sku: fallbackSku, hasVariants,
    marketplaceVisibility: visibility(input.marketplaceVisibility),
    variants: preparedVariants,
    options: input.options,
  };
}

async function createInsideTransaction(store, input, transaction) {
  const { name, price, marketplaceCategory, stockQuantity, status, description, images, currency, barcode, sku: productSku, hasVariants, options } = input;

  // 1. Atomically lock store record to serialize concurrent product creations
  const storeAccess = await StoreAccess.findByPk(store.storeId, {
    transaction,
    lock: transaction?.LOCK ? transaction.LOCK.UPDATE : undefined,
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

  // 4. Check SKU and barcode uniqueness in store
  for (const v of input.variants) {
    await checkSkuUniqueness(store.storeId, v.sku, null, transaction);
    if (v.barcode) await checkBarcodeUniqueness(store.storeId, v.barcode, null, transaction);
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
    currency: currency || 'USD',
    barcode: barcode || null,
    sku: productSku,
    hasVariants: Boolean(hasVariants),
    slug: await uniqueSlug(store.storeId, name, transaction),
  }, { transaction });

  if (!input.skipVariantCreation) {
    for (let i = 0; i < input.variants.length; i += 1) {
      const variant = input.variants[i];
      const isDefault = hasVariants
        ? (Boolean(variant.isDefault) || (i === 0 && !input.variants.some((x) => x.isDefault)))
        : true;
      await ProductVariant.create({
        productId: product.id,
        storeId: store.storeId,
        sku: variant.sku,
        barcode: variant.barcode || null,
        price: variant.price !== undefined ? variant.price : product.price,
        compareAtPrice: variant.compareAtPrice || null,
        currency: product.currency,
        trackInventory: variant.trackInventory !== false,
        stockQuantity: variant.stockQuantity !== undefined ? variant.stockQuantity : product.stockQuantity,
        isDefault,
        optionValues: variant.optionValues && typeof variant.optionValues === 'object' ? variant.optionValues : {},
        status: (product.status === 'archived' || product.status === 'draft') ? 'disabled' : (variant.status || 'active'),
        version: 0,
      }, { transaction });
    }

    if (Array.isArray(options) && options.length > 0) {
      for (let pos = 0; pos < options.length; pos += 1) {
        const opt = options[pos];
        await ProductOption.create({
          productId: product.id,
          name: text(opt.name, 100, 'Option name'),
          type: opt.type || 'select',
          values: Array.isArray(opt.values) ? opt.values : [],
          position: pos,
          required: Boolean(opt.required),
        }, { transaction });
      }
    }
  }

  const created = await Product.findByPk(product.id, {
    include: [{ model: ProductVariant, as: 'ProductVariants' }], transaction,
  });
  return created || product;
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
      where: { id: productId, storeId },
      include: [{ model: ProductVariant, as: 'ProductVariants', required: false }],
      transaction,
      lock: transaction?.LOCK ? transaction.LOCK.UPDATE : undefined,
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
    if (input.currency !== undefined) changes.currency = normalizeCurrency(input.currency);
    if (input.barcode !== undefined) changes.barcode = normalizeBarcode(input.barcode);
    if (input.sku !== undefined) changes.sku = normalizeSku(input.sku);
    if (input.status !== undefined) {
      if (!['active', 'draft', 'archived', 'out_of_stock'].includes(input.status)) fail('Invalid product status');
      changes.status = input.status;
    }
    if (input.variants !== undefined) {
      preparedVariants = variants(input.variants, {
        price: changes.price ?? product.price,
        stockQuantity: changes.stockQuantity ?? product.stockQuantity,
      });
      const existing = (product.ProductVariants && product.ProductVariants.length > 0)
        ? product.ProductVariants
        : await ProductVariant.findAll({
            where: { productId }, transaction, lock: transaction?.LOCK ? transaction.LOCK.UPDATE : undefined,
          });
      const byId = new Map((existing || []).map((entry) => [entry.id, entry]));
      for (const variant of preparedVariants) {
        if (!variant.id) continue;
        const current = byId.get(variant.id);
        if (!current) fail('SKU does not belong to this product', 403, 'SKU_STORE_MISMATCH');
        if (variant.expectedVersion !== undefined && variant.expectedVersion !== current.version) {
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
      const byId = new Map((product.ProductVariants || []).map((entry) => [entry.id, entry]));
      for (const variant of preparedVariants) {
        if (variant.id) {
          retainedIds.push(variant.id);
          const current = byId.get(variant.id) || await ProductVariant.findByPk(variant.id, { transaction });
          if (current) {
            await current.update({
              sku: variant.sku, price: variant.price, stockQuantity: variant.stockQuantity,
              optionValues: variant.optionValues, status: variant.status, version: (current.version || 0) + 1,
            }, { transaction });
          }
        } else {
          const created = await ProductVariant.create({
            productId, storeId, sku: variant.sku, price: variant.price,
            stockQuantity: variant.stockQuantity, optionValues: variant.optionValues,
            status: variant.status,
          }, { transaction });
          retainedIds.push(created.id);
        }
      }
      if (input.replaceVariants === true) {
        await ProductVariant.destroy({
          where: { productId, id: { [Op.notIn]: retainedIds } }, transaction,
        }).catch(() => {});
      }
    }
    const result = await Product.findByPk(updated.id, {
      include: [{ model: ProductVariant, as: 'ProductVariants' }], transaction,
    });
    return result || updated;
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
  const productVariants = (product.ProductVariants || []).map((variant) => ({
    id: variant.id,
    productId: product.id,
    storeId: variant.storeId || product.storeId,
    sku: variant.sku,
    barcode: variant.barcode || null,
    price: variant.price,
    compareAtPrice: variant.compareAtPrice,
    currency: variant.currency || product.currency || 'USD',
    stockQuantity: variant.stockQuantity,
    optionValues: variant.optionValues || {},
    isDefault: Boolean(variant.isDefault),
    status: variant.status,
    version: variant.version,
  }));

  const variants = productVariants.length > 0
    ? productVariants
    : (Array.isArray(product.nicheAttributes?.variants) ? product.nicheAttributes.variants : []);

  return {
    id: product.id, storeId: product.storeId, name: product.name,
    slug: product.slug, description: product.description,
    price: product.price, compareAtPrice: product.compareAtPrice,
    currency: product.currency || 'USD',
    barcode: product.barcode || null,
    sku: product.sku || null,
    hasVariants: Boolean(product.hasVariants),
    category: product.marketplaceCategory,
    images: product.images, stockQuantity: product.stockQuantity,
    status: product.status,
    variants,
    productVariants,
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
      [sequelize.literal("(JSON_EXTRACT(`Product`.`images`, '$[0].url') LIKE '%res.cloudinary.com%')"), 'DESC'],
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

async function getPublicationStatus(storeId, productId, options = {}) {
  const product = await Product.findByPk(productId);
  if (!product || (storeId && product.storeId !== storeId)) {
    const error = new Error('Product not found for this store');
    error.statusCode = 404;
    throw error;
  }

  const { publicationEligibilityService } = require('../catalog');
  return publicationEligibilityService.getPublicationExplanation({
    productId,
    storeId,
    channel: options.channel,
    hostContext: options.hostContext,
    isPrivileged: options.isPrivileged !== false,
  });
}

module.exports = {
  create,
  listOwn,
  getOwn,
  update,
  listPublic,
  getPublic,
  getPublicationStatus,
  eligibleProductWhere,
  publicProduct,
  checkSkuUniqueness,
  checkBarcodeUniqueness,
  prepareCreate,
  createInsideTransaction,
};
