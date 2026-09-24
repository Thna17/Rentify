const categories = Object.freeze([
  'Clothing', 'Shoes', 'Accessories', 'Jewelry',
  'Skincare', 'Beauty', 'Phones & Devices', 'Electronics Accessories',
  'Home Goods', 'Handmade Crafts', 'Pottery', 'Weaving',
  'Food & Beverage', 'Groceries', 'Local Produce', 'Other',
]);

const canonicalCategory = (value) => {
  const text = typeof value === 'string' ? value.trim() : '';
  return categories.find((category) => category.toLowerCase() === text.toLowerCase()) || null;
};

module.exports = { categories, canonicalCategory };
