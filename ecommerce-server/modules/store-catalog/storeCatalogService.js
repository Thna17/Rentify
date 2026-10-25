const { Op } = require('sequelize');
const { randomUUID } = require('node:crypto');
const { sequelize } = require('../../config/db');
const {
  Product,
  ProductVariant,
  ProductOption,
  StoreAccess,
  StoreDeliveryPolicy,
  WebsiteData,
  ProductReview,
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
  error.status = statusCode;
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
  return trimmed;
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
  return value.map((image) => ({ url: image.url }));
}

function category(value) {
  const result = canonicalCategory(value);
  if (!result) fail('Choose a valid marketplace category');
  return result;
}

async function checkSkuUniqueness(storeId, sku, excludeVariantId = null, transaction = null) {
  if (!sku) return;
  const where = { storeId, sku };
  if (excludeVariantId) where.id = { [Op.ne]: excludeVariantId };
  const existing = await ProductVariant.findOne({ where, attributes: ['id', 'sku'], transaction });
  if (existing) {
    fail(`Duplicate SKU identifier "${sku}" within store`, 409, 'DUPLICATE_SKU');
  }
}

async function checkBarcodeUniqueness(storeId, barcode, excludeVariantId = null, transaction = null) {
  if (!barcode) return;
  const where = { storeId, barcode };
  if (excludeVariantId) where.id = { [Op.ne]: excludeVariantId };
  const existing = await ProductVariant.findOne({ where, attributes: ['id', 'barcode'], transaction });
  if (existing) {
    fail(`Duplicate barcode "${barcode}" within store`, 409, 'DUPLICATE_BARCODE');
  }
}

async function create(store, input) {
  const name = text(input.name, 200, 'Name');
  const price = money(input.price, 'price');
  const marketplaceCategory = category(input.marketplaceCategory);
  const stockQuantity = stock(input.stockQuantity);
  const status = input.status || 'draft';
  if (!['active', 'draft'].includes(status)) fail('Invalid product status');
  if (status === 'active' && stockQuantity === 0) fail('Add stock before publishing the product');
  const description = typeof input.description === 'string' ? input.description.trim().slice(0, 4000) : '';
  const images = validateImages(input.images, store.storeId);
  const currency = normalizeCurrency(input.currency);
  const barcode = normalizeBarcode(input.barcode);
  const hasVariants = Array.isArray(input.variants) && input.variants.length > 0;

  return sequelize.transaction(async (transaction) => {
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

    if (hasVariants) {
      // Validate variant payload for duplicate SKUs / barcodes within payload and within Store
      const seenSkus = new Set();
      const seenBarcodes = new Set();
      for (const v of input.variants) {
        const vSku = normalizeSku(v.sku);
        if (vSku) {
          const lower = vSku.toLowerCase();
          if (seenSkus.has(lower)) fail(`Duplicate SKU "${v.sku}" in payload`, 409, 'DUPLICATE_SKU');
          seenSkus.add(lower);
          await checkSkuUniqueness(store.storeId, vSku, null, transaction);
        }
        const vBarcode = normalizeBarcode(v.barcode);
        if (vBarcode) {
          const lower = vBarcode.toLowerCase();
          if (seenBarcodes.has(lower)) fail(`Duplicate barcode "${v.barcode}" in payload`, 409, 'DUPLICATE_BARCODE');
          seenBarcodes.add(lower);
          await checkBarcodeUniqueness(store.storeId, vBarcode, null, transaction);
        }
      }

      const defaultVariantInput = input.variants.find((v) => v.isDefault) || input.variants[0];
      const productSku = normalizeSku(input.sku) || normalizeSku(defaultVariantInput?.sku) || `SKU-${randomUUID().slice(0, 8).toUpperCase()}`;

      const product = await Product.create({
        storeId: store.storeId,
        websiteId: store.websiteId || null,
        websiteNiche,
        productType,
        name, description, price, marketplaceCategory, images,
        marketplaceVisibility: visibility(input.marketplaceVisibility),
        stockQuantity, status,
        currency,
        barcode,
        sku: productSku,
        hasVariants: true,
        slug: await uniqueSlug(store.storeId, name, transaction),
      }, { transaction });

      for (let i = 0; i < input.variants.length; i += 1) {
        const v = input.variants[i];
        const isDefault = Boolean(v.isDefault) || (i === 0 && !input.variants.some((x) => x.isDefault));
        const vSku = normalizeSku(v.sku) || `VAR-${product.id.slice(0, 8).toUpperCase()}-${i + 1}`;
        const vBarcode = normalizeBarcode(v.barcode);
        await ProductVariant.create({
          productId: product.id,
          storeId: store.storeId,
          sku: vSku,
          barcode: vBarcode,
          price: v.price !== undefined ? money(v.price, 'variant price') : product.price,
          compareAtPrice: v.compareAtPrice ? money(v.compareAtPrice, 'variant compareAtPrice') : null,
          currency: product.currency,
          trackInventory: v.trackInventory !== false,
          stockQuantity: v.stockQuantity !== undefined ? stock(v.stockQuantity) : 0,
          isDefault,
          optionValues: v.optionValues && typeof v.optionValues === 'object' ? v.optionValues : {},
          status: v.status || 'active',
          version: 0,
        }, { transaction });
      }

      if (Array.isArray(input.options) && input.options.length > 0) {
        for (let pos = 0; pos < input.options.length; pos += 1) {
          const opt = input.options[pos];
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

      return product;
    }

    // Simple Product: exactly one default SKU
    if (barcode) {
      await checkBarcodeUniqueness(store.storeId, barcode, null, transaction);
    }
    const productSku = normalizeSku(input.sku) || `SKU-${randomUUID().slice(0, 8).toUpperCase()}`;
    await checkSkuUniqueness(store.storeId, productSku, null, transaction);

    const product = await Product.create({
      storeId: store.storeId,
      websiteId: store.websiteId || null,
      websiteNiche,
      productType,
      name, description, price, marketplaceCategory, images,
      marketplaceVisibility: visibility(input.marketplaceVisibility),
      stockQuantity, status,
      currency,
      barcode,
      sku: productSku,
      hasVariants: false,
      slug: await uniqueSlug(store.storeId, name, transaction),
    }, { transaction });

    // Create the default SKU
    await ProductVariant.create({
      productId: product.id,
      storeId: store.storeId,
      sku: product.sku,
      barcode: product.barcode,
      price: product.price,
      compareAtPrice: product.compareAtPrice || null,
      currency: product.currency,
      trackInventory: product.trackInventory !== false,
      stockQuantity: product.stockQuantity,
      isDefault: true,
      optionValues: {},
      status: (product.status === 'archived' || product.status === 'draft') ? 'disabled' : 'active',
      version: 0,
    }, { transaction });

    return product;
  });
}

async function listOwn(storeId, query = {}) {
  const page = Math.max(1, Math.min(100_000, Number.parseInt(query.page, 10) || 1));
  const limit = Math.max(1, Math.min(60, Number.parseInt(query.limit, 10) || 20));
  const { count, rows } = await Product.findAndCountAll({
    where: { storeId },
    include: [
      { model: ProductVariant, as: 'ProductVariants', required: false },
      { model: ProductOption, as: 'ProductOptions', required: false },
    ],
    order: [['createdAt', 'DESC']],
    offset: (page - 1) * limit, limit,
    distinct: true,
  });
  return { products: rows, total: count, page, limit };
}

async function update(storeId, productId, input) {
  return sequelize.transaction(async (transaction) => {
    const product = await Product.findOne({
      where: { id: productId, storeId },
      include: [
        { model: ProductVariant, as: 'ProductVariants', required: false },
        { model: ProductOption, as: 'ProductOptions', required: false },
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!product) fail('Product not found', 404);
    if (!Number.isSafeInteger(input.expectedVersion) || input.expectedVersion !== product.version) {
      fail('Product version has changed; refresh and retry', 409);
    }
    const changes = {};
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
    if (input.status !== undefined) {
      if (!['active', 'draft', 'archived', 'out_of_stock'].includes(input.status)) fail('Invalid product status');
      changes.status = input.status;
    }
    if (changes.status === 'active' &&
        (changes.stockQuantity ?? product.stockQuantity) === 0) {
      fail('Add stock before publishing the product');
    }

    // Default SKU synchronization for simple products
    const defaultVariant = (product.ProductVariants || []).find((v) => v.isDefault) || (product.ProductVariants || [])[0];

    if (input.sku !== undefined) {
      const normalized = normalizeSku(input.sku);
      if (normalized && normalized !== product.sku) {
        await checkSkuUniqueness(storeId, normalized, defaultVariant?.id, transaction);
      }
      changes.sku = normalized;
    }

    if (input.barcode !== undefined) {
      const normalized = normalizeBarcode(input.barcode);
      if (normalized && normalized !== product.barcode) {
        await checkBarcodeUniqueness(storeId, normalized, defaultVariant?.id, transaction);
      }
      changes.barcode = normalized;
    }

    if (!product.hasVariants && defaultVariant) {
      const variantChanges = {};
      if (changes.price !== undefined) variantChanges.price = changes.price;
      if (changes.stockQuantity !== undefined) variantChanges.stockQuantity = changes.stockQuantity;
      if (changes.sku !== undefined) variantChanges.sku = changes.sku;
      if (changes.barcode !== undefined) variantChanges.barcode = changes.barcode;
      if (changes.currency !== undefined) variantChanges.currency = changes.currency;
      if (changes.status !== undefined) {
        variantChanges.status = (changes.status === 'archived' || changes.status === 'draft') ? 'disabled' : 'active';
      }
      if (Object.keys(variantChanges).length > 0) {
        await defaultVariant.update(variantChanges, { transaction });
      }
    }

    // Variant updates preserving stable IDs
    if (input.variants !== undefined && Array.isArray(input.variants)) {
      const existingVariants = product.ProductVariants || [];
      const existingById = new Map(existingVariants.map((v) => [v.id, v]));
      const existingBySku = new Map(existingVariants.map((v) => [v.sku?.toLowerCase(), v]));

      // Validate payload for duplicates
      const seenSkus = new Set();
      const seenBarcodes = new Set();
      for (const v of input.variants) {
        const vSku = normalizeSku(v.sku);
        if (vSku) {
          const lower = vSku.toLowerCase();
          if (seenSkus.has(lower)) fail(`Duplicate SKU "${v.sku}" in payload`, 409, 'DUPLICATE_SKU');
          seenSkus.add(lower);
          const matched = (v.id && existingById.get(v.id)) || existingBySku.get(lower);
          await checkSkuUniqueness(storeId, vSku, matched?.id, transaction);
        }
        const vBarcode = normalizeBarcode(v.barcode);
        if (vBarcode) {
          const lower = vBarcode.toLowerCase();
          if (seenBarcodes.has(lower)) fail(`Duplicate barcode "${v.barcode}" in payload`, 409, 'DUPLICATE_BARCODE');
          seenBarcodes.add(lower);
          const matched = (v.id && existingById.get(v.id)) || (v.sku && existingBySku.get(v.sku.trim().toLowerCase()));
          await checkBarcodeUniqueness(storeId, vBarcode, matched?.id, transaction);
        }
      }

      for (let i = 0; i < input.variants.length; i += 1) {
        const v = input.variants[i];
        let existing = null;
        if (v.id && existingById.has(v.id)) {
          existing = existingById.get(v.id);
        } else if (v.sku && existingBySku.has(v.sku.trim().toLowerCase())) {
          existing = existingBySku.get(v.sku.trim().toLowerCase());
        }

        const isDefault = v.isDefault !== undefined ? Boolean(v.isDefault) : (i === 0);

        if (existing) {
          // Update in place preserving stable variant identity
          await existing.update({
            sku: v.sku ? normalizeSku(v.sku) : existing.sku,
            barcode: v.barcode !== undefined ? normalizeBarcode(v.barcode) : existing.barcode,
            price: v.price !== undefined ? money(v.price, 'variant price') : existing.price,
            compareAtPrice: v.compareAtPrice !== undefined ? (v.compareAtPrice ? money(v.compareAtPrice, 'variant compareAtPrice') : null) : existing.compareAtPrice,
            stockQuantity: v.stockQuantity !== undefined ? stock(v.stockQuantity) : existing.stockQuantity,
            trackInventory: v.trackInventory !== undefined ? Boolean(v.trackInventory) : existing.trackInventory,
            isDefault,
            optionValues: v.optionValues && typeof v.optionValues === 'object' ? v.optionValues : existing.optionValues,
            status: v.status !== undefined ? v.status : existing.status,
          }, { transaction });
        } else {
          // Create new variant
          await ProductVariant.create({
            productId: product.id,
            storeId,
            sku: normalizeSku(v.sku) || `VAR-${product.id.slice(0, 8).toUpperCase()}-${i + 1}`,
            barcode: normalizeBarcode(v.barcode),
            price: v.price !== undefined ? money(v.price, 'variant price') : product.price,
            compareAtPrice: v.compareAtPrice ? money(v.compareAtPrice, 'variant compareAtPrice') : null,
            currency: product.currency || 'USD',
            trackInventory: v.trackInventory !== false,
            stockQuantity: v.stockQuantity !== undefined ? stock(v.stockQuantity) : 0,
            isDefault,
            optionValues: v.optionValues && typeof v.optionValues === 'object' ? v.optionValues : {},
            status: v.status || 'active',
            version: 0,
          }, { transaction });
        }
      }
      changes.hasVariants = true;
    }

    if (!Object.keys(changes).length) fail('No product changes provided');
    return product.update({ ...changes, version: product.version + 1 }, { transaction });
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
  const variants = Array.isArray(product.ProductVariants) && product.ProductVariants.length > 0
    ? product.ProductVariants.map((v) => ({
        id: v.id,
        productId: v.productId,
        storeId: v.storeId,
        sku: v.sku,
        barcode: v.barcode,
        price: v.price,
        compareAtPrice: v.compareAtPrice,
        currency: v.currency || product.currency || 'USD',
        stockQuantity: v.stockQuantity,
        optionValues: v.optionValues || {},
        isDefault: Boolean(v.isDefault),
        status: v.status,
      }))
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
    rating: ratingSummary?.rating ?? 0,
    reviewCount: ratingSummary?.reviewCount ?? 0,
  };
}

async function listPublic(query = {}) {
  const page = Math.max(1, Math.min(100_000, Number.parseInt(query.page, 10) || 1));
  const limit = Math.max(1, Math.min(60, Number.parseInt(query.limit, 10) || 20));
  const where = eligibleProductWhere(query);
  const { count, rows } = await Product.findAndCountAll({
    where,
    include: [
      eligibleStore,
      { model: ProductVariant, as: 'ProductVariants', where: { status: 'active' }, required: false },
    ],
    distinct: true, subQuery: false,
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
    include: [
      eligibleStore,
      { model: ProductVariant, as: 'ProductVariants', where: { status: 'active' }, required: false },
    ],
  });
  if (!product) fail('Product not found', 404);
  const ratings = await ratingSummariesFor([product.id]);
  return publicProduct(product, ratings.get(product.id));
}

module.exports = {
  create,
  listOwn,
  update,
  listPublic,
  getPublic,
  eligibleProductWhere,
  publicProduct,
  checkSkuUniqueness,
  checkBarcodeUniqueness,
};
