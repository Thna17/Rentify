// One-off backfill: give every legacy simple product a default SKU (variant), the way
// product creation does today (store-catalog/storeCatalogService.js).
//
// Products created before SKUs became automatic have no ProductVariant rows. The canonical SKU
// migration (20261025_014) only marked a default on products that already had variants, so these
// products have no SKU, and the merchant launch checklist cannot count them (docs/notes.md, "Does a
// SKU block going live?").
//
//   npm run db:backfill-default-skus            dry run: prints the report, changes nothing
//   npm run db:backfill-default-skus -- --apply creates the default SKUs
//
// The default variant gets the SAME id as its product. For a product without variants the inventory
// ledger already keys its balance by the product id (sharedStockService: skuId = product.id), so the
// existing balance, reservations and history keep applying to the new SKU with no ledger rewrite.
//
// Rollback: the report lists every created variant id (= product id). Delete those ProductVariant
// rows and, where productSkuSet is true, set Product.sku back to NULL.
const { randomBytes } = require('node:crypto');
const { Op } = require('sequelize');

const slugify = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

/** Same shape as storeCatalogService defaultSku(): NAME-PART-<suffix>, upper case, within a Store. */
function generateSku(name, taken, random = () => randomBytes(4).toString('hex')) {
  const base = slugify(name).slice(0, 20).toUpperCase() || 'SKU';
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = `${base}-${random().toUpperCase()}`;
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error(`Could not generate a unique SKU for "${name}"`);
}

/** Variant status follows the product, as on creation: drafts and retired products are disabled. */
const variantStatusFor = (productStatus) =>
  (['draft', 'archived', 'inactive'].includes(productStatus) ? 'disabled' : 'active');

/** Keeps a product SKU that is already unique in its Store; otherwise generates one. */
function chooseSku(product, taken, random) {
  const own = typeof product.sku === 'string' ? product.sku.trim().toUpperCase() : '';
  if (own && !taken.has(own)) return { sku: own, productSkuSet: false };
  return { sku: generateSku(product.name, taken, random), productSkuSet: !own };
}

async function run({ apply }) {
  const sequelize = require('../config/db').sequelize;
  const { Product, ProductVariant } = require('../models');
  const report = { mode: apply ? 'apply' : 'dry-run', inspected: 0, created: [], skippedHasVariants: 0, failed: [] };

  const products = await Product.findAll({ attributes: ['id'], order: [['createdAt', 'ASC']] });
  const variantCounts = new Map((await ProductVariant.findAll({
    attributes: ['productId', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
    group: ['productId'],
    raw: true,
  })).map((row) => [row.productId, Number(row.count)]));

  for (const { id } of products) {
    report.inspected += 1;
    if (variantCounts.get(id)) {
      report.skippedHasVariants += 1;
      continue;
    }
    try {
      const outcome = await sequelize.transaction(async (transaction) => {
        const product = await Product.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
        if (!product) return null;
        if (await ProductVariant.count({ where: { productId: id }, transaction })) return 'has-variants';
        const storeId = product.storeId || null;
        const where = storeId ? { storeId } : { productId: id };
        const [variantSkus, productSkus] = await Promise.all([
          ProductVariant.findAll({ where: { ...where, sku: { [Op.ne]: null } }, attributes: ['sku'], transaction }),
          storeId
            ? Product.findAll({ where: { storeId, id: { [Op.ne]: id }, sku: { [Op.ne]: null } }, attributes: ['sku'], transaction })
            : [],
        ]);
        const taken = new Set([...variantSkus, ...productSkus].map((row) => String(row.sku).toUpperCase()));
        const { sku, productSkuSet } = chooseSku(product, taken);
        if (apply) {
          await ProductVariant.create({
            id: product.id,
            productId: product.id,
            storeId,
            sku,
            barcode: product.barcode || null,
            price: product.price,
            compareAtPrice: product.compareAtPrice || null,
            currency: product.currency || 'USD',
            trackInventory: product.trackInventory !== false,
            stockQuantity: Number.isInteger(product.stockQuantity) ? product.stockQuantity : 0,
            isDefault: true,
            optionValues: {},
            status: variantStatusFor(product.status),
            version: 0,
          }, { transaction });
          await product.update({ sku, hasVariants: false }, { transaction });
        }
        return { productId: id, storeId, name: product.name, sku, productSkuSet };
      });
      if (outcome === 'has-variants') report.skippedHasVariants += 1;
      else if (outcome) report.created.push(outcome);
    } catch (error) {
      report.failed.push({ productId: id, error: error.message });
    }
  }

  console.log(JSON.stringify(report, null, 2));
  if (!apply && report.created.length) {
    console.log(`Dry run: ${report.created.length} product(s) would get a default SKU. Re-run with --apply.`);
  }
  if (report.failed.length) process.exitCode = 1;
  await sequelize.close();
}

if (require.main === module) {
  run({ apply: process.argv.includes('--apply') }).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { generateSku, variantStatusFor, chooseSku, slugify };
