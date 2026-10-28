// modules/invoices/index.js
// Public entry point of the invoices module. Other modules must require this file,
// not the files inside the module. Members load lazily when first read.

const invoiceErrors = require('./invoiceErrors');

module.exports = {
  get invoiceFulfillmentService() {
    return require('./invoiceFulfillmentService');
  },
  ...invoiceErrors,
};
