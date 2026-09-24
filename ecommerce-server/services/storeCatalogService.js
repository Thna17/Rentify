const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { Product, StoreAccess, StoreDeliveryPolicy, WebsiteData } = require('../models');
const { canonicalCategory } = require('../config/marketplaceTaxonomy');

function fail(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
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

function validateImages(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 10 || value.some((image) =>
    !image || typeof image.url !== 'string' || !/^https:\/\//i.test(image.url) || image.url.length > 2048)) {
    fail('Images must be up to 10 HTTPS URLs');
  }
  return value.map((image) => ({ url: image.url }));
}

function category(value) {
  const result = canonicalCategory(value);
  if (!result) fail('Choose a valid marketplace category');
  return result;
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
  const images = validateImages(input.images);
  return sequelize.transaction(async (transaction) => {
    const website = store.websiteId ? await WebsiteData.findOne({
      where: { websiteId: store.websiteId, storeId: store.storeId }, transaction,
    }) : null;
    if (store.websiteId && !website) fail('Website projection is not ready', 409);
    const websiteNiche = website?.niche || 'ecommerce';
    const productType = {
      restaurant: 'food', cafe: 'beverage', fashion: 'clothing',
      skincare: 'cleanser', electronics: 'device', grocery: 'fresh',
    }[websiteNiche] || 'physical';
    return Product.create({
    storeId: store.storeId,
    websiteId: store.websiteId || null,
    websiteNiche,
    productType,
    name, description, price, marketplaceCategory, images,
    marketplaceVisibility: visibility(input.marketplaceVisibility),
    stockQuantity, status,
    slug: await uniqueSlug(store.storeId, name, transaction),
    }, { transaction });
  });
}

async function listOwn(storeId, query = {}) {
  const page = Math.max(1, Math.min(100_000, Number.parseInt(query.page, 10) || 1));
  const limit = Math.max(1, Math.min(60, Number.parseInt(query.limit, 10) || 20));
  const { count, rows } = await Product.findAndCountAll({
    where: { storeId }, order: [['createdAt', 'DESC']],
    offset: (page - 1) * limit, limit,
  });
  return { products: rows, total: count, page, limit };
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
    if (input.name !== undefined) {
      changes.name = text(input.name, 200, 'Name');
      if (changes.name !== product.name) changes.slug = await uniqueSlug(storeId, changes.name, transaction);
    }
    if (input.description !== undefined) {
      if (typeof input.description !== 'string' || input.description.length > 4000) fail('Invalid description');
      changes.description = input.description.trim();
    }
    if (input.price !== undefined) changes.price = money(input.price, 'price');
    if (input.stockQuantity !== undefined) changes.stockQuantity = stock(input.stockQuantity);
    if (input.marketplaceCategory !== undefined) changes.marketplaceCategory = category(input.marketplaceCategory);
    if (input.marketplaceVisibility !== undefined) changes.marketplaceVisibility = visibility(input.marketplaceVisibility);
    if (input.images !== undefined) changes.images = validateImages(input.images);
    if (input.status !== undefined) {
      if (!['active', 'draft', 'archived'].includes(input.status)) fail('Invalid product status');
      changes.status = input.status;
    }
    if ((changes.status || product.status) === 'active' &&
        (changes.stockQuantity ?? product.stockQuantity) === 0) {
      fail('Add stock before publishing the product');
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
  include: [{ model: StoreDeliveryPolicy, as: 'deliveryPolicy', required: true, attributes: [] }],
};

function publicProduct(product) {
  return {
    id: product.id, storeId: product.storeId, name: product.name,
    slug: product.slug, description: product.description,
    price: product.price, compareAtPrice: product.compareAtPrice,
    category: product.marketplaceCategory,
    images: product.images, stockQuantity: product.stockQuantity,
    status: product.status,
  };
}

async function listPublic(query = {}) {
  const page = Math.max(1, Math.min(100_000, Number.parseInt(query.page, 10) || 1));
  const limit = Math.max(1, Math.min(60, Number.parseInt(query.limit, 10) || 20));
  const where = eligibleProductWhere(query);
  const { count, rows } = await Product.findAndCountAll({
    where, include: [eligibleStore], distinct: true, subQuery: false,
    order: [['createdAt', 'DESC']], offset: (page - 1) * limit, limit,
  });
  const products = rows.map(publicProduct);
  return { products, total: count, page, limit };
}

async function getPublic(productId) {
  const product = await Product.findOne({
    where: { id: productId, ...eligibleProductWhere() }, include: [eligibleStore],
  });
  if (!product) fail('Product not found', 404);
  return publicProduct(product);
}

module.exports = { create, listOwn, update, listPublic, getPublic, eligibleProductWhere, publicProduct };
