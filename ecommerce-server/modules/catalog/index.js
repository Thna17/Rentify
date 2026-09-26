// Public entry point of the catalog module. Other modules must require this file,
// not the files inside the module. Members load lazily when first read.
module.exports = {
  get ProductService() { return require('./ProductService'); },
};
