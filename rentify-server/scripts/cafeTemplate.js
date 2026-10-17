// rentify-server/scripts/cafeTemplate.js
// Template 3 (café) constants shared by seed.js and seedCafeStore.js.

const TEMPLATE_3_ID = '56245606-c064-4507-85cb-05a611cb3d8f';

// Mekong Brew, the café demo store. The ids must match
// ecommerce-server/scripts/seedCafeStore.js.
const CAFE_MERCHANT_ID = '1aa7d5ff-31ae-4057-9f8f-353ea8991fd8';
const CAFE_WEBSITE_ID = '4effbe7b-55fa-479b-a73f-eaee81189136';
// Used only when the merchant has no Store yet (a fresh database).
const DEFAULT_CAFE_STORE_ID = 'a6b158b9-f18d-4bee-a3c4-56b585da3d49';

// Template 3 section fields merchants edit in the design editor. Mirrors
// TEMPLATE_3_FIELDS in rentify-frontend/apps/templates/ecommerce/ecommerce-template-3/src/storeContent.js
// (Announcement, Hero Headline, Hero Subtitle and Hero Image are shared
// fields). Every field starts empty: the storefront hides a section until the
// merchant fills it in, so a new café never shows placeholder claims.
const TEMPLATE_3_SECTION_FIELDS = [
  ['Hero', 'Hero Eyebrow'],
  ['Hero', 'Hero Button Text'],
  ['Hero', 'Hero Note'],
  ['Highlights', 'Highlight 1'],
  ['Highlights', 'Highlight 2'],
  ['Highlights', 'Highlight 3'],
  ['Highlights', 'Highlight 4'],
  ['Signature Drinks', 'Featured Title'],
  ['Signature Drinks', 'Featured Category'],
  ['Menu', 'Menu Title'],
  ['Menu', 'Menu Note'],
  ['Feature Banner', 'Feature Eyebrow'],
  ['Feature Banner', 'Feature Title'],
  ['Feature Banner', 'Feature Text'],
  ['Feature Banner', 'Feature Image', 'image'],
  ['Feature Banner', 'Feature Button Text'],
  ['Feature Banner', 'Feature Button Link'],
  ['Feature Banner', 'Feature Note'],
  ['Our Story', 'Story Title'],
  ['Our Story', 'Story Text'],
  ['Our Story', 'Story Image', 'image'],
  ['Visit Us', 'Visit Title'],
  ['Visit Us', 'Opening Hours'],
  ['Visit Us', 'Map Link'],
];

const unsplash = (id, width) => `https://images.unsplash.com/photo-${id}?w=${width}&auto=format&fit=crop&q=80`;

// Mekong Brew's section content, keyed by label.
const CAFE_SECTION_VALUES = {
  'Hero Eyebrow': 'Specialty coffee · Phnom Penh',
  'Hero Note': 'Freshly roasted this week',
  'Highlight 1': 'Freshly roasted | Every week, in-house',
  'Highlight 2': 'Oat milk | At no extra cost',
  'Highlight 3': 'Free Wi-Fi | Stay and work',
  'Highlight 4': 'Cash on delivery | Pay when it arrives',
  'Featured Title': 'House favourites',
  'Featured Category': 'Espresso Bar',
  'Menu Note': 'Oat or almond milk at no extra cost · Extra shot +$0.50',
  'Feature Eyebrow': 'For your kitchen',
  'Feature Title': 'Beans to brew at home',
  'Feature Text': 'Take our house blend home, ground for your filter or as whole beans.',
  'Feature Image': [unsplash('1559056199-641a0ac8b55e', 1600)],
  'Feature Button Text': 'Shop beans',
  'Feature Button Link': '/products?category=Beans%20to%20Take%20Home',
  'Feature Note': 'Roasted on Mondays',
  'Story Title': 'From Mondulkiri to your cup',
  'Story Text':
    'We buy directly from three family farms in Mondulkiri.\nEvery bag is roasted in our shop on Street 240, so the coffee in your cup is never more than a week old.',
  'Story Image': [unsplash('1501339847302-ac426a4a7cbb', 1200)],
  'Opening Hours': 'Mon–Fri | 7:00–18:00\nSat–Sun | 7:30–20:00',
  'Map Link': 'https://maps.google.com/?q=Street+240+Daun+Penh+Phnom+Penh',
};

// Shared storefront fields (identity, hero and contact) for Mekong Brew.
const CAFE_IDENTITY_CONTENT = [
  ['Header', 'Site Title', 'text', { text: 'Mekong Brew' }],
  ['global setting', 'Website Name', 'text', 'Mekong Brew'],
  ['Header', 'Announcement', 'text', { text: 'Free delivery in Phnom Penh on orders over $10' }],
  ['Hero', 'Hero Headline', 'text', { text: 'Slow coffee for fast mornings' }],
  ['Hero', 'Hero Subtitle', 'text', { text: 'Khmer beans from Mondulkiri, roasted in small batches and brewed with care.' }],
  ['homepage', 'Hero Image', 'image[]', [unsplash('1495474472287-4d71bcdd2085', 1600), unsplash('1442512595331-e89e73853f31', 1600)]],
  ['Color Palette', 'Color Palette', 'palette', { primary: '#8A4B2A', secondary: '#2B1D16', background: '#FBF7F1' }],
  ['Contact', 'Phone', 'text', { text: '012 345 678' }],
  ['Contact', 'Location', 'text', { text: 'No. 24, Street 240, Daun Penh, Phnom Penh' }],
  ['Footer', 'Copyright', 'text', { text: '© 2026 Mekong Brew. Powered by Rentify.' }],
];

module.exports = {
  TEMPLATE_3_ID,
  TEMPLATE_3_SECTION_FIELDS,
  CAFE_MERCHANT_ID,
  CAFE_WEBSITE_ID,
  DEFAULT_CAFE_STORE_ID,
  CAFE_SECTION_VALUES,
  CAFE_IDENTITY_CONTENT,
};
