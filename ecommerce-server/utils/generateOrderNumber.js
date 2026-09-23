function generateOrderNumber() {
  const date = new Date();
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, ''); // e.g. 20250804
  const randomPart = Math.random().toString(36).substr(2, 4).toUpperCase(); // e.g. AB12
  return `ORD-${datePart}-${randomPart}`;
}

module.exports = {generateOrderNumber}