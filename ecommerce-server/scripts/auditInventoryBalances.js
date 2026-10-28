// ecommerce-server/scripts/auditInventoryBalances.js
// P3-INV-001: Audit command that reconstructs expected balances from the append-only ledger
// and verifies non-negative invariants, reservation invariants, and store ownership.

const { sequelize } = require('../config/db');
const {
  InventoryBalance,
  InventoryLedgerEntry,
  InventoryReservation,
  ProductVariant,
} = require('../models');

async function audit({
  InventoryBalanceModel = InventoryBalance,
  InventoryLedgerEntryModel = InventoryLedgerEntry,
  InventoryReservationModel = InventoryReservation,
  ProductVariantModel = ProductVariant,
} = {}) {
  const balances = await InventoryBalanceModel.findAll();
  const ledgerEntries = await InventoryLedgerEntryModel.findAll();
  const reservations = await InventoryReservationModel.findAll();

  const report = {
    totalBalances: balances.length,
    totalLedgerEntries: ledgerEntries.length,
    totalReservations: reservations.length,
    defects: {
      negativeBalances: 0,
      reservedExceedsOnHand: 0,
      availableMismatch: 0,
      ledgerSumMismatchOnHand: 0,
      ledgerSumMismatchReserved: 0,
      reservationSumMismatch: 0,
      storeMismatches: 0,
    },
    compliant: true,
  };

  // Group ledger entries by "storeId:skuId"
  const ledgerSums = new Map();
  for (const entry of ledgerEntries) {
    const key = `${entry.storeId}:${entry.skuId}`;
    if (!ledgerSums.has(key)) {
      ledgerSums.set(key, { changeOnHand: 0, changeReserved: 0, entries: 0 });
    }
    const current = ledgerSums.get(key);
    current.changeOnHand += entry.changeOnHand;
    current.changeReserved += entry.changeReserved;
    current.entries += 1;
  }

  // Group active reservations by "storeId:skuId"
  const reservationSums = new Map();
  for (const res of reservations) {
    if (res.status === 'active') {
      const key = `${res.storeId}:${res.skuId}`;
      const sum = (reservationSums.get(key) || 0) + res.quantity;
      reservationSums.set(key, sum);
    }
  }

  for (const balance of balances) {
    const key = `${balance.storeId}:${balance.skuId}`;
    const ledger = ledgerSums.get(key) || { changeOnHand: 0, changeReserved: 0 };
    const activeReserved = reservationSums.get(key) || 0;

    // 1. Invariant: onHand >= 0
    if (balance.onHand < 0) {
      report.defects.negativeBalances++;
    }

    // 2. Invariant: reserved <= onHand
    if (balance.reserved > balance.onHand || balance.reserved < 0) {
      report.defects.reservedExceedsOnHand++;
    }

    // 3. Invariant: available === onHand - reserved (available >= 0)
    if (balance.available !== (balance.onHand - balance.reserved) || balance.available < 0) {
      report.defects.availableMismatch++;
    }

    // 4. Invariant: Balance matches exact sum of ledger changes
    if (balance.onHand !== ledger.changeOnHand) {
      report.defects.ledgerSumMismatchOnHand++;
    }

    if (balance.reserved !== ledger.changeReserved) {
      report.defects.ledgerSumMismatchReserved++;
    }

    // 5. Invariant: Balance reserved matches sum of active reservations
    if (balance.reserved !== activeReserved) {
      report.defects.reservationSumMismatch++;
    }

    // 6. Invariant: Store ownership
    if (ProductVariantModel) {
      const variant = await ProductVariantModel.findByPk(balance.skuId).catch(() => null);
      if (variant && variant.storeId && variant.storeId !== balance.storeId) {
        report.defects.storeMismatches++;
      }
    }
  }

  const hasDefects = Object.values(report.defects).some((d) => d > 0);
  report.compliant = !hasDefects;

  return report;
}

if (require.main === module) {
  audit()
    .then((report) => {
      console.log(JSON.stringify(report, null, 2));
      if (!report.compliant) {
        console.error('P3-INV-001 Inventory audit FAILED: Invariant defects found.');
        process.exit(1);
      }
      console.log('P3-INV-001 Inventory audit passed: 100% compliance.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Audit execution error:', err);
      process.exit(1);
    });
}

module.exports = { audit };
