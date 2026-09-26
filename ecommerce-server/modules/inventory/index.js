// Public entry point of the inventory module. Other modules must require this file,
// not the files inside the module. Members load lazily when first read.
module.exports = {
  get sharedStockService() { return require('./sharedStockService'); },
  get stockService() { return require('./stockService'); },
};
