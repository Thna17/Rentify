/**
 * Website content a store owner may edit from their live storefront
 * (PUT /api/websites/:websiteId/storefront-content). Anything else, such as
 * the palette, theme or store name, stays in the merchant dashboard.
 *
 * Mirrors the storefront templates' editable sections:
 * rentify-frontend/apps/templates/ecommerce/ecommerce-template-2/src/storeContent.js
 * and ecommerce-template-3/src/storeContent.js (Template 1 uses the shared
 * hero and announcement fields).
 *
 * text:  plain string, trimmed, up to `max` characters ('' clears it)
 * image: one https URL (or '' to clear); `multiple` allows up to `max` URLs
 */
const text = (category, max) => ({ category, type: 'text', max });
const image = (category, options = {}) => ({ category, type: options.multiple ? 'image[]' : 'image', ...options });

const STOREFRONT_CONTENT_FIELDS = Object.freeze({
  'Page Layout': { category: 'Layout', type: 'layout' },
  Announcement: text('Header', 160),
  'Hero Eyebrow': text('Hero', 60),
  'Hero Headline': text('Hero', 120),
  'Hero Subtitle': text('Hero', 300),
  'Hero Image': image('homepage', { multiple: true, max: 6 }),
  'Hero Button Text': text('Hero', 40),
  'Hero Note': text('Hero', 60),
  'Highlight 1': text('Highlights', 120),
  'Highlight 2': text('Highlights', 120),
  'Highlight 3': text('Highlights', 120),
  'Highlight 4': text('Highlights', 120),
  'Feature Eyebrow': text('Feature Banner', 60),
  'Feature Title': text('Feature Banner', 120),
  'Feature Text': text('Feature Banner', 400),
  'Feature Image': image('Feature Banner'),
  'Feature Button Text': text('Feature Banner', 40),
  'Feature Button Link': text('Feature Banner', 300),
  'Feature Note': text('Feature Banner', 60),
  'Featured Title': text('Featured Products', 80),
  'Featured Category': text('Featured Products', 120),
  'Shop by Need Title': text('Shop by Need', 80),
  'Shop by Need': text('Shop by Need', 400),
  'Story Title': text('Our Story', 120),
  'Story Text': text('Our Story', 1200),
  'Story Image': image('Our Story'),
  // Template 3 (café)
  'Menu Title': text('Menu', 80),
  'Menu Note': text('Menu', 300),
  'Visit Title': text('Visit Us', 80),
  'Opening Hours': text('Visit Us', 400),
  'Map Link': text('Visit Us', 300),
});

const MAX_URL_LENGTH = 2048;
// Control characters other than tab and newline never belong in store copy.
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const TEMPLATE_SECTIONS = Object.freeze({
  1: ['categories', 'newArrivals', 'categoryRows'],
  2: ['highlights', 'categories', 'newArrivals', 'feature', 'featured', 'needs', 'story'],
  3: ['highlights', 'signature', 'menu', 'feature', 'story', 'visit'],
  4: ['categories', 'newArrivals', 'closing'],
});

const safeImageUrl = (value, storeId) => {
  if (typeof value !== 'string') return null;
  const url = value.trim();
  if (!url || url.length > MAX_URL_LENGTH) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return null;
    if (storeId) {
      const match = url.match(/rentify\/stores\/([a-zA-Z0-9-]+)\//i);
      if (match && match[1] !== storeId) {
        return false;
      }
    }
    return parsed.toString();
  } catch {
    return null;
  }
};

/**
 * Validates `{ label: value }` from the storefront editor. Returns
 * `{ values: [{ label, category, type, value }], errors: [{ label, message }] }`.
 */
const validateStorefrontContent = (fields, storeId) => {
  const values = [];
  const errors = [];
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
    return { values, errors: [{ label: null, message: 'Send the fields to update as an object' }] };
  }

  for (const [label, raw] of Object.entries(fields)) {
    const spec = STOREFRONT_CONTENT_FIELDS[label];
    if (!spec) {
      errors.push({ label, message: 'This field cannot be edited from the storefront' });
      continue;
    }

    if (spec.type === 'layout') {
      const validObject = raw && typeof raw === 'object' && !Array.isArray(raw);
      const valid = validObject && Object.entries(raw).every(([id, layout]) => {
        if (!Object.hasOwn(TEMPLATE_SECTIONS, id) || typeof layout !== 'string' || layout.length > 1000) return false;
        const parts = layout === '' ? [] : layout.split(',');
        const names = parts.map((part) => part.startsWith('-') ? part.slice(1) : part);
        return names.every((name) => TEMPLATE_SECTIONS[id].includes(name)) && new Set(names).size === names.length;
      });
      if (!valid) { errors.push({ label, message: 'Invalid page layout' }); continue; }
      values.push({ label, category: spec.category, type: spec.type, value: raw });
      continue;
    }
    if (spec.type === 'text') {
      if (typeof raw !== 'string') {
        errors.push({ label, message: 'Must be text' });
        continue;
      }
      const value = raw.replace(CONTROL_CHARACTERS, '').trim();
      if (value.length > spec.max) {
        errors.push({ label, message: `Must be ${spec.max} characters or fewer` });
        continue;
      }
      values.push({ label, category: spec.category, type: spec.type, value });
      continue;
    }

    const list = Array.isArray(raw) ? raw : [raw];
    const urls = list.filter((item) => item !== '' && item !== null && item !== undefined);
    const clean = urls.map((u) => safeImageUrl(u, storeId));
    if (clean.some((url) => url === false)) {
      errors.push({ label, message: 'Cross-store media reference prohibited' });
      continue;
    }
    if (clean.some((url) => !url)) {
      errors.push({ label, message: 'Images must be https:// links' });
      continue;
    }
    if (spec.multiple && clean.length > spec.max) {
      errors.push({ label, message: `Up to ${spec.max} images` });
      continue;
    }
    if (!spec.multiple && clean.length > 1) {
      errors.push({ label, message: 'Only one image' });
      continue;
    }
    values.push({ label, category: spec.category, type: spec.type, value: spec.multiple ? clean : clean[0] || '' });
  }

  return { values, errors };
};

module.exports = { STOREFRONT_CONTENT_FIELDS, validateStorefrontContent, TEMPLATE_SECTIONS };
