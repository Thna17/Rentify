// modules/orders/index.js
// Public entry point of the orders module. Other modules must require this file,
// not the files inside the module. Members load lazily when first read.

const orderErrors = require('./orderErrors');

module.exports = {
  get orderStateMachineService() {
    return require('./orderStateMachineService');
  },
  ...orderErrors,
};
