/**
 * Website content a store owner may edit from their live storefront
 * (PUT /api/websites/:websiteId/storefront-content). Anything else, such as
 * the palette, theme or store name, stays in the merchant dashboard.
 *
 * Mirrors the storefront templates' editable sections:
 * rentify-frontend/apps/templates/ecommerce/ecommerce-template-2/src/storeContent.js
 * (Template 1 uses the shared hero and announcement fields).
 *
 * text:  plain string, trimmed, up to `max` characters ('' clears it)
 * image: one https URL (or '' to clear); `multiple` allows up to `max` URLs
 */
const text = (category, max) => ({ category, type: 'text', max });
const image = (category, options = {}) => ({ category, type: options.multiple ? 'image[]' : 'image', ...options });

const STOREFRONT_CONTENT_FIELDS = Object.freeze({
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
});

const MAX_URL_LENGTH = 2048;
// Control characters other than tab and newline never belong in store copy.
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

const safeImageUrl = (value) => {
  if (typeof value !== 'string') return null;
  const url = value.trim();
  if (!url || url.length > MAX_URL_LENGTH) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password ? parsed.toString() : null;
  } catch {
    return null;
  }
};

/**
 * Validates `{ label: value }` from the storefront editor. Returns
 * `{ values: [{ label, category, type, value }], errors: [{ label, message }] }`.
 */
const validateStorefrontContent = (fields) => {
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
    const clean = urls.map(safeImageUrl);
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

module.exports = { STOREFRONT_CONTENT_FIELDS, validateStorefrontContent };
