const STORE_CATEGORIES = Object.freeze([
  'Fashion', 'Beauty & Skincare', 'Electronics', 'Home & Living',
  'Food & Beverage', 'Groceries', 'Handmade Crafts', 'Other',
]);

const normalizeStoreCategory = (value) => {
  const category = typeof value === 'string' ? value.trim() : '';
  return STORE_CATEGORIES.find((option) => option.toLowerCase() === category.toLowerCase()) || null;
};

module.exports = { STORE_CATEGORIES, normalizeStoreCategory };
