const test = require('node:test');
const assert = require('node:assert/strict');
const { validateStorefrontContent } = require('../../src/config/storefrontContentFields');

test('storefront editing accepts only allowlisted fields with valid values', () => {
  const { values, errors } = validateStorefrontContent({
    'Hero Headline': '  Glow naturally \u0007 ',
    'Hero Image': ['https://res.cloudinary.com/demo/a.jpg', ''],
    'Story Image': '',
    'Color Palette': { primary: '#000' },
    'Website Name': 'Another name',
    'Feature Image': 'javascript:alert(1)',
    'Highlight 1': 'x'.repeat(121),
    'Hero Note': 42,
  });
  assert.deepEqual(values, [
    { label: 'Hero Headline', category: 'Hero', type: 'text', value: 'Glow naturally' },
    { label: 'Hero Image', category: 'homepage', type: 'image[]', value: ['https://res.cloudinary.com/demo/a.jpg'] },
    { label: 'Story Image', category: 'Our Story', type: 'image', value: '' },
  ]);
  assert.deepEqual(
    errors.map((error) => error.label),
    ['Color Palette', 'Website Name', 'Feature Image', 'Highlight 1', 'Hero Note']
  );
});

test('images must be https and within the per-field limit', () => {
  assert.equal(validateStorefrontContent({ 'Story Image': 'http://example.com/a.jpg' }).errors.length, 1);
  const seven = Array.from({ length: 7 }, (_, i) => `https://cdn.example.com/${i}.jpg`);
  assert.equal(validateStorefrontContent({ 'Hero Image': seven }).errors[0].message, 'Up to 6 images');
  assert.equal(validateStorefrontContent({ 'Feature Image': ['https://a.test/1.jpg', 'https://a.test/2.jpg'] }).errors[0].message, 'Only one image');
  assert.equal(validateStorefrontContent(null).errors.length, 1);
});
