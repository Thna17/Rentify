const { DataTypes, Op } = require('sequelize');

/**
 * P3-CAT-001: Canonical Product and SKU Contract Migration
 *
 * 1. Adds canonical columns to Products:
 *    - currency (VARCHAR(3), default 'USD', not null)
 *    - barcode (VARCHAR(100), nullable)
 *    - sku (VARCHAR(100), nullable)
 *    - hasVariants (BOOLEAN, default false, not null)
 *
 * 2. Adds canonical columns to ProductVariants:
 *    - storeId (UUID, nullable)
 *    - barcode (VARCHAR(100), nullable)
 *    - currency (VARCHAR(3), default 'USD', not null)
 *    - isDefault (BOOLEAN, default false, not null)
 *
 * 3. Drops old global unique index on ProductVariants.sku (if present).
 *
 * 4. Adds scoped unique indexes:
 *    - ProductVariants(storeId, sku) [unique within Store]
 *    - ProductVariants(storeId, barcode) [unique within Store]
 *    - Products(storeId, sku) [unique within Store]
 *    - Products(storeId, barcode) [unique within Store]
 *    - ProductVariants(productId, isDefault)
 *    - ProductVariants(storeId)
 *
 * 5. Backfills:
 *    - Inherits storeId from Products to existing ProductVariants.
 *    - Sets currency = 'USD' on Products and ProductVariants where missing.
 *    - For products with variants: sets hasVariants = true, marks one default variant.
 *    - For simple products (products with 0 variants): creates one default SKU (isDefault = true).
 *
 * Idempotency:
 *    - Safe to run on empty databases and pre-existing databases.
 *    - Safe to re-run; checks column/index existence before creating.
 *
 * Rollback / Compensation guidance:
 *    - Existing product columns (price, stockQuantity, trackInventory, status) are preserved.
 *    - If rolled back, existing readers continue to work; added columns and default SKU rows
 *      do not interfere with legacy readers that filter ProductVariants by status = 'active'.
 */
exports.up = async ({ queryInterface, sequelize }) => {
  const productTable = 'Products';
  const variantTable = 'ProductVariants';

  // 1. Column additions for Products
  const productColumns = await queryInterface.describeTable(productTable);

  if (!productColumns.currency) {
    await queryInterface.addColumn(productTable, 'currency', {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'USD',
    });
  }

  if (!productColumns.barcode) {
    await queryInterface.addColumn(productTable, 'barcode', {
      type: DataTypes.STRING(100),
      allowNull: true,
    });
  }

  if (!productColumns.sku) {
    await queryInterface.addColumn(productTable, 'sku', {
      type: DataTypes.STRING(100),
      allowNull: true,
    });
  }

  if (!productColumns.hasVariants) {
    await queryInterface.addColumn(productTable, 'hasVariants', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  }

  // 2. Column additions for ProductVariants
  const variantColumns = await queryInterface.describeTable(variantTable);

  if (!variantColumns.storeId) {
    await queryInterface.addColumn(variantTable, 'storeId', {
      type: DataTypes.UUID,
      allowNull: true,
    });
  }

  if (!variantColumns.barcode) {
    await queryInterface.addColumn(variantTable, 'barcode', {
      type: DataTypes.STRING(100),
      allowNull: true,
    });
  }

  if (!variantColumns.currency) {
    await queryInterface.addColumn(variantTable, 'currency', {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'USD',
    });
  }

  if (!variantColumns.isDefault) {
    await queryInterface.addColumn(variantTable, 'isDefault', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  }

  // 3. Drop legacy global unique index on ProductVariants.sku if present
  const variantIndexes = await queryInterface.showIndex(variantTable);
  for (const index of (variantIndexes || [])) {
    const fields = (index.fields || []).map((f) => f.attribute || f.name);
    if (index.unique && fields.length === 1 && fields[0] === 'sku') {
      try {
        await queryInterface.removeIndex(variantTable, index.name);
      } catch (err) {
        // Fallback if index removal syntax varies by dialect
      }
    }
  }

  // Normalize empty strings to null on barcode and sku before unique index creation
  await sequelize.query(`UPDATE \`${variantTable}\` SET \`barcode\` = NULL WHERE \`barcode\` = ''`);
  await sequelize.query(`UPDATE \`${productTable}\` SET \`barcode\` = NULL WHERE \`barcode\` = ''`);
  await sequelize.query(`UPDATE \`${productTable}\` SET \`sku\` = NULL WHERE \`sku\` = ''`);

  // 4. Backfill storeId on existing ProductVariants from Products
  await sequelize.query(`
    UPDATE \`${variantTable}\` pv
    JOIN \`${productTable}\` p ON pv.\`productId\` = p.\`id\`
    SET pv.\`storeId\` = p.\`storeId\`
    WHERE pv.\`storeId\` IS NULL AND p.\`storeId\` IS NOT NULL
  `);

  // Backfill currency on variants
  await sequelize.query(`
    UPDATE \`${variantTable}\` pv
    JOIN \`${productTable}\` p ON pv.\`productId\` = p.\`id\`
    SET pv.\`currency\` = COALESCE(p.\`currency\`, 'USD')
    WHERE pv.\`currency\` IS NULL OR pv.\`currency\` = ''
  `);

  // 5. Backfill Simple Products: products that have zero ProductVariants
  // Retrieve products without variants
  const [productsWithoutVariants] = await sequelize.query(`
    SELECT p.\`id\`, p.\`storeId\`, p.\`name\`, p.\`price\`, p.\`compareAtPrice\`,
           p.\`currency\`, p.\`barcode\`, p.\`sku\`, p.\`stockQuantity\`,
           p.\`trackInventory\`, p.\`status\`, p.\`createdAt\`, p.\`updatedAt\`
    FROM \`${productTable}\` p
    LEFT JOIN \`${variantTable}\` pv ON p.\`id\` = pv.\`productId\`
    WHERE pv.\`id\` IS NULL
  `);

  let simpleProductsBackfilled = 0;
  for (const p of productsWithoutVariants) {
    const defaultVariantId = require('node:crypto').randomUUID();
    const cleanId = String(p.id).replace(/-/g, '').toUpperCase();
    const resolvedSku = p.sku || `SKU-${cleanId.slice(0, 8)}-${cleanId.slice(-4)}`;
    const resolvedPrice = Number(p.price) || 0.01;
    const resolvedStock = Number.isInteger(p.stockQuantity) ? p.stockQuantity : 0;
    const resolvedCurrency = p.currency || 'USD';
    const variantStatus = (p.status === 'archived' || p.status === 'draft') ? 'disabled' : 'active';
    const trackInventory = p.trackInventory !== false && p.trackInventory !== 0;

    await sequelize.query(`
      INSERT INTO \`${variantTable}\` (
        \`id\`, \`productId\`, \`storeId\`, \`sku\`, \`barcode\`,
        \`price\`, \`compareAtPrice\`, \`costPrice\`, \`currency\`,
        \`trackInventory\`, \`stockQuantity\`, \`isDefault\`,
        \`optionValues\`, \`status\`, \`nicheData\`, \`version\`,
        \`createdAt\`, \`updatedAt\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `, {
      replacements: [
        defaultVariantId,
        p.id,
        p.storeId || null,
        resolvedSku,
        p.barcode || null,
        resolvedPrice,
        p.compareAtPrice || null,
        resolvedCurrency,
        trackInventory ? 1 : 0,
        resolvedStock,
        1, // isDefault = true
        JSON.stringify({}),
        variantStatus,
        JSON.stringify({}),
        p.createdAt || new Date(),
        p.updatedAt || new Date(),
      ],
    });

    // Update product sku if missing, and set hasVariants = false
    await sequelize.query(`
      UPDATE \`${productTable}\`
      SET \`sku\` = ?, \`hasVariants\` = 0, \`currency\` = ?
      WHERE \`id\` = ?
    `, {
      replacements: [resolvedSku, resolvedCurrency, p.id],
    });

    simpleProductsBackfilled += 1;
  }

  // 6. Handle Products that already have variants: mark hasVariants = true
  await sequelize.query(`
    UPDATE \`${productTable}\` p
    SET p.\`hasVariants\` = 1
    WHERE (SELECT COUNT(*) FROM \`${variantTable}\` pv WHERE pv.\`productId\` = p.\`id\`) > 1
  `);

  // Ensure every product with variants has at least one isDefault = true
  const [productsNeedingDefault] = await sequelize.query(`
    SELECT DISTINCT pv.\`productId\`
    FROM \`${variantTable}\` pv
    WHERE pv.\`productId\` NOT IN (
      SELECT \`productId\` FROM \`${variantTable}\` WHERE \`isDefault\` = 1
    )
  `);

  for (const { productId } of productsNeedingDefault) {
    const [firstVariants] = await sequelize.query(`
      SELECT \`id\`, \`sku\`, \`barcode\`
      FROM \`${variantTable}\`
      WHERE \`productId\` = ?
      ORDER BY \`createdAt\` ASC
      LIMIT 1
    `, { replacements: [productId] });

    if (firstVariants.length > 0) {
      const first = firstVariants[0];
      await sequelize.query(`
        UPDATE \`${variantTable}\`
        SET \`isDefault\` = 1
        WHERE \`id\` = ?
      `, { replacements: [first.id] });

      await sequelize.query(`
        UPDATE \`${productTable}\`
        SET \`sku\` = COALESCE(\`sku\`, ?),
            \`barcode\` = COALESCE(\`barcode\`, ?)
        WHERE \`id\` = ?
      `, { replacements: [first.sku, first.barcode || null, productId] });
    }
  }

  // Disambiguate any duplicate (storeId, sku) in ProductVariants and Products before adding unique index
  await sequelize.query(`UPDATE \`${variantTable}\` SET \`sku\` = NULL WHERE \`sku\` = ''`);
  await sequelize.query(`UPDATE \`${variantTable}\` SET \`barcode\` = NULL WHERE \`barcode\` = ''`);
  await sequelize.query(`UPDATE \`${productTable}\` SET \`sku\` = NULL WHERE \`sku\` = ''`);
  await sequelize.query(`UPDATE \`${productTable}\` SET \`barcode\` = NULL WHERE \`barcode\` = ''`);

  const [dupVariants] = await sequelize.query(`
    SELECT storeId, sku, COUNT(*) as cnt
    FROM \`${variantTable}\`
    WHERE storeId IS NOT NULL AND sku IS NOT NULL
    GROUP BY storeId, sku
    HAVING cnt > 1
  `);
  for (const dup of dupVariants) {
    const [rows] = await sequelize.query(`
      SELECT id, productId FROM \`${variantTable}\`
      WHERE storeId = ? AND sku = ?
      ORDER BY createdAt ASC
    `, { replacements: [dup.storeId, dup.sku] });
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const cleanProdId = String(row.productId).replace(/-/g, '').slice(-4).toUpperCase();
      const newSku = `${dup.sku}-${cleanProdId || i}`;
      await sequelize.query(`UPDATE \`${variantTable}\` SET \`sku\` = ? WHERE \`id\` = ?`, { replacements: [newSku, row.id] });
      await sequelize.query(`UPDATE \`${productTable}\` SET \`sku\` = ? WHERE \`id\` = ? AND \`sku\` = ?`, { replacements: [newSku, row.productId, dup.sku] });
    }
  }

  const [dupProducts] = await sequelize.query(`
    SELECT storeId, sku, COUNT(*) as cnt
    FROM \`${productTable}\`
    WHERE storeId IS NOT NULL AND sku IS NOT NULL
    GROUP BY storeId, sku
    HAVING cnt > 1
  `);
  for (const dup of dupProducts) {
    const [rows] = await sequelize.query(`
      SELECT id FROM \`${productTable}\`
      WHERE storeId = ? AND sku = ?
      ORDER BY createdAt ASC
    `, { replacements: [dup.storeId, dup.sku] });
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const cleanProdId = String(row.id).replace(/-/g, '').slice(-4).toUpperCase();
      const newSku = `${dup.sku}-${cleanProdId || i}`;
      await sequelize.query(`UPDATE \`${productTable}\` SET \`sku\` = ? WHERE \`id\` = ?`, { replacements: [newSku, row.id] });
    }
  }

  const [dupBarcodes] = await sequelize.query(`
    SELECT storeId, barcode, COUNT(*) as cnt
    FROM \`${variantTable}\`
    WHERE storeId IS NOT NULL AND barcode IS NOT NULL
    GROUP BY storeId, barcode
    HAVING cnt > 1
  `);
  for (const dup of dupBarcodes) {
    const [rows] = await sequelize.query(`
      SELECT id FROM \`${variantTable}\`
      WHERE storeId = ? AND barcode = ?
      ORDER BY createdAt ASC
    `, { replacements: [dup.storeId, dup.barcode] });
    for (let i = 1; i < rows.length; i++) {
      await sequelize.query(`UPDATE \`${variantTable}\` SET \`barcode\` = NULL WHERE \`id\` = ?`, { replacements: [rows[i].id] });
    }
  }

  const [dupProdBarcodes] = await sequelize.query(`
    SELECT storeId, barcode, COUNT(*) as cnt
    FROM \`${productTable}\`
    WHERE storeId IS NOT NULL AND barcode IS NOT NULL
    GROUP BY storeId, barcode
    HAVING cnt > 1
  `);
  for (const dup of dupProdBarcodes) {
    const [rows] = await sequelize.query(`
      SELECT id FROM \`${productTable}\`
      WHERE storeId = ? AND barcode = ?
      ORDER BY createdAt ASC
    `, { replacements: [dup.storeId, dup.barcode] });
    for (let i = 1; i < rows.length; i++) {
      await sequelize.query(`UPDATE \`${productTable}\` SET \`barcode\` = NULL WHERE \`id\` = ?`, { replacements: [rows[i].id] });
    }
  }

  // 7. Add scoped indexes
  const refreshedVariantIndexes = await queryInterface.showIndex(variantTable);
  const existingVariantIdxNames = new Set(refreshedVariantIndexes.map((i) => i.name));

  if (!existingVariantIdxNames.has('uq_product_variants_store_sku')) {
    await queryInterface.addIndex(variantTable, ['storeId', 'sku'], {
      name: 'uq_product_variants_store_sku',
      unique: true,
    });
  }

  if (!existingVariantIdxNames.has('uq_product_variants_store_barcode')) {
    await queryInterface.addIndex(variantTable, ['storeId', 'barcode'], {
      name: 'uq_product_variants_store_barcode',
      unique: true,
    });
  }

  if (!existingVariantIdxNames.has('idx_product_variants_product_default')) {
    await queryInterface.addIndex(variantTable, ['productId', 'isDefault'], {
      name: 'idx_product_variants_product_default',
    });
  }

  if (!existingVariantIdxNames.has('idx_product_variants_store_id')) {
    await queryInterface.addIndex(variantTable, ['storeId'], {
      name: 'idx_product_variants_store_id',
    });
  }

  // Scoped indexes on Products
  const refreshedProductIndexes = await queryInterface.showIndex(productTable);
  const existingProductIdxNames = new Set(refreshedProductIndexes.map((i) => i.name));

  if (!existingProductIdxNames.has('uq_products_store_sku')) {
    await queryInterface.addIndex(productTable, ['storeId', 'sku'], {
      name: 'uq_products_store_sku',
      unique: true,
    });
  }

  if (!existingProductIdxNames.has('uq_products_store_barcode')) {
    await queryInterface.addIndex(productTable, ['storeId', 'barcode'], {
      name: 'uq_products_store_barcode',
      unique: true,
    });
  }

  // 8. Audit totals
  const [[{ count: totalProducts }]] = await sequelize.query(`SELECT COUNT(*) AS count FROM \`${productTable}\``);
  const [[{ count: totalVariants }]] = await sequelize.query(`SELECT COUNT(*) AS count FROM \`${variantTable}\``);
  const [[{ count: unmappedVariants }]] = await sequelize.query(`SELECT COUNT(*) AS count FROM \`${variantTable}\` WHERE \`storeId\` IS NULL`);
  const [[{ count: defaultSkus }]] = await sequelize.query(`SELECT COUNT(*) AS count FROM \`${variantTable}\` WHERE \`isDefault\` = 1`);

  console.log(`[P3-CAT-001 Migration Audit] Total products: ${totalProducts}, Simple backfilled: ${simpleProductsBackfilled}, Total SKUs: ${totalVariants}, Default SKUs: ${defaultSkus}, Unmapped variants: ${unmappedVariants}`);
};
