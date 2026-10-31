const categories = Object.freeze([
  'Clothing', 'Shoes', 'Accessories', 'Jewelry',
  'Skincare', 'Beauty', 'Phones & Devices', 'Electronics Accessories',
  'Home Goods', 'Handmade Crafts', 'Pottery', 'Weaving',
  'Food & Beverage', 'Groceries', 'Local Produce', 'Other',
]);

const SYNONYMS = {
  // Existing marketplace catalog labels map to canonical publication categories.
  'phones & tablets': 'Phones & Devices',
  'bags & luggage': 'Accessories',
  "men's clothing": 'Clothing',
  'unisex clothing': 'Clothing',
  'face care': 'Skincare',
  'sun care': 'Skincare',
  'bath & body': 'Beauty',
  'body care': 'Beauty',
  'hair care': 'Beauty',
  haircare: 'Beauty',
  'snacks & dried fruit': 'Food & Beverage',
  'art supplies': 'Other',
  'paper & notebooks': 'Other',
  'school supplies': 'Other',
  stationery: 'Other',
  ceramics: 'Pottery',
  'handicrafts & pottery': 'Pottery',
  'fashion & textiles': 'Clothing',
};

const canonicalCategory = (value) => {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!text) return null;
  if (SYNONYMS[text]) return SYNONYMS[text];
  return categories.find((category) => category.toLowerCase() === text) || null;
};

module.exports = { categories, canonicalCategory };
