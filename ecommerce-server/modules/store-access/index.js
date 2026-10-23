// Public entry point of the store-access module. Other modules must require this file,
// not the files inside the module. Members load lazily when first read.
module.exports = {
  get storeAccessService() { return require('./storeAccessService'); },
};
