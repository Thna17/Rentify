const { randomBytes } = require('node:crypto');

function generateOrderNumber() {
  const date = new Date();
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, ''); // e.g. 20250804
  const randomPart = randomBytes(8).toString('hex').toUpperCase();
  return `ORD-${datePart}-${randomPart}`;
}

module.exports = {generateOrderNumber}
