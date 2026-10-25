#!/usr/bin/env node
'use strict';

// ecommerce-server/scripts/reconcileLegacyWebsiteStock.js
// P3-INV-002: Reconciliation audit script for legacy Website orders and canonical inventory.
// Reports mapped vs unmapped orders, ambiguous mappings, and fails safely on unexplained records.

const { reconcileLegacyWebsiteStock } = require('../modules/inventory/legacyWebsiteReconciliationService');
const { sequelize } = require('../config/db');

async function main() {
  const args = process.argv.slice(2);
  const strict = args.includes('--strict');
  let websiteId = null;
  let storeId = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--website' && args[i + 1]) websiteId = args[i + 1];
    if (args[i] === '--store' && args[i + 1]) storeId = args[i + 1];
  }

  console.log('=== Legacy Website Order Stock Reconciliation ===');
  console.log(`Mode: ${strict ? 'STRICT' : 'AUDIT'}`);
  if (websiteId) console.log(`Filter WebsiteId: ${websiteId}`);
  if (storeId) console.log(`Filter StoreId: ${storeId}`);
  console.log('Running reconciliation audit...\n');

  try {
    const report = await reconcileLegacyWebsiteStock({ websiteId, storeId, strict });

    console.log('--- Reconciliation Summary ---');
    console.log(`Total Orders Inspected:        ${report.summary.totalOrders}`);
    console.log(`Mapped Orders:                 ${report.summary.mappedOrders}`);
    console.log(`Unmapped Website Orders:       ${report.summary.unmappedOrders}`);
    console.log(`Ambiguous Orders:              ${report.summary.ambiguousOrders}`);
    console.log(`Reconciled Ledger Orders:      ${report.summary.reconciledLedgerOrders}`);
    console.log(`Historical Unmigrated Orders:  ${report.summary.unmigratedHistoricalOrders}`);
    console.log(`Unexplained Records:           ${report.summary.unexplainedRecordsCount}`);
    console.log(`Status:                        ${report.summary.status}`);

    if (report.details.unexplainedRecords.length > 0) {
      console.error('\n❌ CRITICAL: Unexplained records detected:');
      for (const rec of report.details.unexplainedRecords) {
        console.error(`  - [${rec.type}] ${rec.description}`);
      }
      console.error('Failing safely: Unexplained records require investigation before proceeding.');
      process.exit(1);
    }

    if (report.details.ambiguousOrders.length > 0) {
      console.warn('\n⚠️ WARNING: Ambiguous orders found:');
      for (const ord of report.details.ambiguousOrders) {
        console.warn(`  - Order ${ord.orderId} (${ord.orderNumber}): ${ord.websiteError || 'Ambiguous SKU mapping'}`);
      }
    }

    if (report.details.unmappedOrders.length > 0) {
      console.warn('\n⚠️ WARNING: Unmapped orders found:');
      for (const ord of report.details.unmappedOrders) {
        console.warn(`  - Order ${ord.orderId} (${ord.orderNumber}): ${ord.websiteError || 'Unmapped items'}`);
      }
    }

    if (strict && (report.summary.ambiguousOrders > 0 || report.summary.unmappedOrders > 0)) {
      console.error('\nStrict mode failure: Discrepancies found.');
      process.exit(1);
    }

    console.log('\n✔ Reconciliation audit completed safely.');
    process.exit(0);
  } catch (err) {
    console.error('Reconciliation failed with error:', err.message);
    process.exit(1);
  } finally {
    if (sequelize?.close) {
      await sequelize.close().catch(() => {});
    }
  }
}

main();
