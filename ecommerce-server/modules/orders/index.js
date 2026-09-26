// Public entry point of the orders module. Other modules must require this file,
// not the files inside the module. Members load lazily when first read.
module.exports = {
  get OrderController() { return require('./OrderController'); },
};
