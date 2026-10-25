// ecommerce-server/modules/inventory/index.js
// Public entry point of the inventory module. Other modules must require this file,
// not the files inside the module. Members load lazily when first read.
const inventoryErrors = require('./inventoryErrors');
const { ALLOWED_REASON_CODES } = require('./inventoryLedgerService');

module.exports = {
  get sharedStockService() { return require('./sharedStockService'); },
  get stockService() { return require('./stockService'); },
  get inventoryLedgerService() { return require('./inventoryLedgerService'); },
  ALLOWED_REASON_CODES,
  ...inventoryErrors,
};
