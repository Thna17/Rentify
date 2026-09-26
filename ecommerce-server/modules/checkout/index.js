// Public entry point of the checkout module. Other modules must require this file,
// not the files inside the module. Members load lazily when first read.
module.exports = {
  get marketplaceCheckoutController() { return require('./marketplaceCheckoutController'); },
  get merchantContactService() { return require('./merchantContactService'); },
};
