// utils/invoiceUtils.js
const generateInvoiceNumber = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `INV-${timestamp}-${random}`;
};

module.exports = { generateInvoiceNumber };