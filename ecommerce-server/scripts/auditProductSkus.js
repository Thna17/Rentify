const { sequelize } = require('../config/db');

async function audit() {
  const [[{ count: totalProducts }]] = await sequelize.query('SELECT COUNT(*) AS count FROM `Products`');
  const [[{ count: totalVariants }]] = await sequelize.query('SELECT COUNT(*) AS count FROM `ProductVariants`');
  const [[{ count: simpleProducts }]] = await sequelize.query('SELECT COUNT(*) AS count FROM `Products` WHERE `hasVariants` = 0');
  const [[{ count: variantProducts }]] = await sequelize.query('SELECT COUNT(*) AS count FROM `Products` WHERE `hasVariants` = 1');

  // Simple products missing a default SKU
  const [missingDefaultSkuRows] = await sequelize.query(`
    SELECT p.\`id\`, p.\`name\`
    FROM \`Products\` p
    WHERE p.\`hasVariants\` = 0
      AND p.\`id\` NOT IN (
        SELECT pv.\`productId\` FROM \`ProductVariants\` pv WHERE pv.\`isDefault\` = 1
      )
  `);

  // Products with zero variants of any kind
  const [productsWithoutAnyVariant] = await sequelize.query(`
    SELECT p.\`id\`, p.\`name\`
    FROM \`Products\` p
    LEFT JOIN \`ProductVariants\` pv ON p.\`id\` = pv.\`productId\`
    WHERE pv.\`id\` IS NULL
  `);

  // Variants missing storeId
  const [[{ count: variantsMissingStoreId }]] = await sequelize.query(`
    SELECT COUNT(*) AS count FROM \`ProductVariants\` WHERE \`storeId\` IS NULL
  `);

  // Duplicate SKUs within the same Store
  const [duplicateSkusInStore] = await sequelize.query(`
    SELECT \`storeId\`, \`sku\`, COUNT(*) AS \`count\`
    FROM \`ProductVariants\`
    WHERE \`sku\` IS NOT NULL AND \`sku\` <> ''
    GROUP BY \`storeId\`, \`sku\`
    HAVING COUNT(*) > 1
  `);

  // Duplicate barcodes within the same Store
  const [duplicateBarcodesInStore] = await sequelize.query(`
    SELECT \`storeId\`, \`barcode\`, COUNT(*) AS \`count\`
    FROM \`ProductVariants\`
    WHERE \`barcode\` IS NOT NULL AND \`barcode\` <> ''
    GROUP BY \`storeId\`, \`barcode\`
    HAVING COUNT(*) > 1
  `);

  // Store mismatch between Product and its Variants
  const [[{ count: storeMismatches }]] = await sequelize.query(`
    SELECT COUNT(*) AS count
    FROM \`ProductVariants\` pv
    JOIN \`Products\` p ON pv.\`productId\` = p.\`id\`
    WHERE pv.\`storeId\` IS NOT NULL AND p.\`storeId\` IS NOT NULL AND pv.\`storeId\` <> p.\`storeId\`
  `);

  const summary = {
    totalProducts: Number(totalProducts),
    simpleProducts: Number(simpleProducts),
    variantProducts: Number(variantProducts),
    totalVariants: Number(totalVariants),
    defects: {
      simpleProductsMissingDefaultSku: missingDefaultSkuRows.length,
      productsWithoutAnyVariant: productsWithoutAnyVariant.length,
      variantsMissingStoreId: Number(variantsMissingStoreId),
      duplicateSkusInStore: duplicateSkusInStore.length,
      duplicateBarcodesInStore: duplicateBarcodesInStore.length,
      storeMismatches: Number(storeMismatches),
    },
    compliant: (
      missingDefaultSkuRows.length === 0 &&
      productsWithoutAnyVariant.length === 0 &&
      Number(variantsMissingStoreId) === 0 &&
      duplicateSkusInStore.length === 0 &&
      duplicateBarcodesInStore.length === 0 &&
      Number(storeMismatches) === 0
    ),
  };

  console.log(JSON.stringify(summary, null, 2));

  if (!summary.compliant) {
    console.error('P3-CAT-001 SKU audit detected compliance violations.');
    process.exitCode = 1;
  } else {
    console.log('P3-CAT-001 SKU audit passed: 100% compliance.');
  }

  return summary;
}

if (require.main === module) {
  audit().catch((error) => {
    console.error('Audit failed:', error.message);
    process.exitCode = 1;
  }).finally(() => sequelize.close());
}

module.exports = { audit };
