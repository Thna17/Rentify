const test = require('node:test');
const assert = require('node:assert/strict');
const { canonicalCategory } = require('../../config/marketplaceTaxonomy');

test('existing public catalog category labels resolve for publication and cart eligibility', () => {
  const aliases = { 'Phones & Tablets': 'Phones & Devices', 'Bags & Luggage': 'Accessories', "Men's Clothing": 'Clothing', 'Unisex Clothing': 'Clothing', 'Face Care': 'Skincare', 'Sun Care': 'Skincare', 'Bath & Body': 'Beauty', 'Body Care': 'Beauty', 'Hair Care': 'Beauty', Haircare: 'Beauty', 'Snacks & Dried Fruit': 'Food & Beverage', 'Art Supplies': 'Other', 'Paper & Notebooks': 'Other', 'School Supplies': 'Other', Stationery: 'Other' };
  for (const [label, category] of Object.entries(aliases)) assert.equal(canonicalCategory(label), category, label);
  assert.equal(canonicalCategory('unsupported category'), null);
  assert.equal(canonicalCategory(''), null);
});
