// Public entry point of the commerce-sync module. Other modules must require this file,
// not the files inside the module. Members load lazily when first read.
module.exports = {
  get ecommerceSyncService() { return require('./ecommerceSyncService'); },
  get storeSyncService() { return require('./storeSyncService'); },
};
