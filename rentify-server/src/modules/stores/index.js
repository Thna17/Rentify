// Public entry point of the stores module. Other modules must require this file,
// not the files inside the module. Members load lazily when first read.
module.exports = {
  get sellerReviewController() { return require('./sellerReviewController'); },
  get storeService() { return require('./storeService'); },
};
