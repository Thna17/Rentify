const test = require('node:test');
const assert = require('node:assert/strict');
const { validateStorefrontContent, TEMPLATE_SECTIONS } = require('../../src/modules/websites/storefrontContentFields');
const { TEMPLATE_3_SECTION_FIELDS } = require('../../scripts/cafeTemplate');

test('page layouts accept known sections and reject hero, duplicates and unknown ids', () => {
  assert.equal(validateStorefrontContent({ 'Page Layout': { 1: 'newArrivals,-categories,categoryRows', 3: 'visit,-menu' } }).errors.length, 0);
  for (const layout of [{ 5: 'menu' }, { 1: 'hero,categories' }, { 1: '-hero' }, { 1: 'categories,-categories' }, { 1: 'visit' }]) {
    assert.equal(validateStorefrontContent({ 'Page Layout': layout }).errors.length, 1);
  }
});

test('server layout sections match the storefront preview definitions', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const vm = require('node:vm');
  const source = fs.readFileSync(path.join(__dirname, '../../../rentify-frontend/libs/storefront/src/preview.jsx'), 'utf8');
  const match = source.match(/export const TEMPLATE_SECTIONS = Object\.freeze\((\{[\s\S]*?\})\);/);
  assert.ok(match, 'storefront section definitions must be present');
  assert.equal(JSON.stringify(vm.runInNewContext(`(${match[1]})`)), JSON.stringify(TEMPLATE_SECTIONS));
});

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

test('the café template fields are editable from the storefront, as plain text', () => {
  const { values, errors } = validateStorefrontContent({
    'Menu Title': ' Our menu ',
    'Opening Hours': 'Mon–Fri | 7:00–18:00\nSun | Closed',
    'Map Link': 'https://maps.google.com/?q=cafe',
    'Menu Note': 'x'.repeat(301),
  });
  assert.deepEqual(values, [
    { label: 'Menu Title', category: 'Menu', type: 'text', value: 'Our menu' },
    { label: 'Opening Hours', category: 'Visit Us', type: 'text', value: 'Mon–Fri | 7:00–18:00\nSun | Closed' },
    { label: 'Map Link', category: 'Visit Us', type: 'text', value: 'https://maps.google.com/?q=cafe' },
  ]);
  assert.deepEqual(errors.map((error) => error.label), ['Menu Note']);
});

test('every Template 3 section field seeded for new cafés can be edited from the storefront', () => {
  const cleared = Object.fromEntries(TEMPLATE_3_SECTION_FIELDS.map(([, label]) => [label, '']));
  assert.deepEqual(validateStorefrontContent(cleared).errors, []);
});
