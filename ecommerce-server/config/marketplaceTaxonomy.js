const categories = Object.freeze([
  'Clothing', 'Shoes', 'Accessories', 'Jewelry',
  'Skincare', 'Beauty', 'Phones & Devices', 'Electronics Accessories',
  'Home Goods', 'Handmade Crafts', 'Pottery', 'Weaving',
  'Food & Beverage', 'Groceries', 'Local Produce', 'Other',
]);

const SYNONYMS = {
  ceramics: 'Pottery',
};

const canonicalCategory = (value) => {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!text) return null;
  if (SYNONYMS[text]) return SYNONYMS[text];
  return categories.find((category) => category.toLowerCase() === text) || null;
};

module.exports = { categories, canonicalCategory };
