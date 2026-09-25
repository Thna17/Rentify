import { contentImages, contentText, getContentValue, safeUrl } from '@rentify/storefront/content';

/**
 * Everything a merchant can edit on this template, in the order the design
 * editor and the storefront's owner tools list it. Labels are the
 * `WebsiteContents` labels; the same list is seeded as Template 2's
 * `TemplateContents` in rentify-server so new websites start with these
 * fields. Owner edits from the storefront are saved by Core's
 * PUT /api/websites/:websiteId/storefront-content, which allowlists the same
 * labels in rentify-server/src/config/storefrontContentFields.js.
 *
 * Every field is optional. A section is shown only when the merchant has
 * filled in what it needs, so the store never displays placeholder claims.
 * Store name, logo, contact details, social links and palette are the shared
 * fields read by `getStoreIdentity`.
 */
export const TEMPLATE_2_FIELDS = [
  { category: 'Header', label: 'Announcement', type: 'text', hint: 'Short message shown in a bar above the header' },
  { category: 'Hero', label: 'Hero Eyebrow', type: 'text', hint: 'Short line above the headline, e.g. "Pure botanical skincare"' },
  { category: 'Hero', label: 'Hero Headline', type: 'text', hint: 'Main headline; the store name is used when empty' },
  { category: 'Hero', label: 'Hero Subtitle', type: 'text', multiline: true, hint: 'One or two sentences about the store' },
  { category: 'Hero', label: 'Hero Image', type: 'image', multiple: true, max: 6, hint: 'Portrait photo shown in the arch; several images rotate' },
  { category: 'Hero', label: 'Hero Button Text', type: 'text', hint: 'Defaults to "Shop now"' },
  { category: 'Hero', label: 'Hero Note', type: 'text', hint: 'A few handwritten-style words beside the photo' },
  { category: 'Highlights', label: 'Highlight 1', type: 'text', hint: 'Title | short detail, e.g. "Fast delivery | Across Cambodia"' },
  { category: 'Highlights', label: 'Highlight 2', type: 'text', hint: 'Title | short detail' },
  { category: 'Highlights', label: 'Highlight 3', type: 'text', hint: 'Title | short detail' },
  { category: 'Highlights', label: 'Highlight 4', type: 'text', hint: 'Title | short detail' },
  { category: 'Feature Banner', label: 'Feature Eyebrow', type: 'text', hint: 'Small line above the banner title' },
  { category: 'Feature Banner', label: 'Feature Title', type: 'text', hint: 'The banner appears once this is filled in' },
  { category: 'Feature Banner', label: 'Feature Text', type: 'text', multiline: true },
  { category: 'Feature Banner', label: 'Feature Image', type: 'image' },
  { category: 'Feature Banner', label: 'Feature Button Text', type: 'text' },
  { category: 'Feature Banner', label: 'Feature Button Link', type: 'text', hint: 'A page of this store (/products) or a full https:// link' },
  { category: 'Feature Banner', label: 'Feature Note', type: 'text', hint: 'A few handwritten-style words' },
  { category: 'Featured Products', label: 'Featured Title', type: 'text', hint: 'Heading for the second product row, e.g. "Best sellers"' },
  { category: 'Featured Products', label: 'Featured Category', type: 'text', hint: 'Name of the category whose products fill that row' },
  { category: 'Shop by Need', label: 'Shop by Need Title', type: 'text', hint: 'Defaults to "Shop by need"' },
  { category: 'Shop by Need', label: 'Shop by Need', type: 'text', multiline: true, hint: 'Comma-separated search words, e.g. "Hydration, Brightening"' },
  { category: 'Our Story', label: 'Story Title', type: 'text', hint: 'The story section appears once this is filled in' },
  { category: 'Our Story', label: 'Story Text', type: 'text', multiline: true },
  { category: 'Our Story', label: 'Story Image', type: 'image' },
];

export const MAX_HIGHLIGHTS = 4;
export const MAX_NEEDS = 8;
const MAX_NEED_LENGTH = 40;

/** "Title | detail" (or "Title — detail") into its two parts. */
export const parseHighlight = (value) => {
  const [title, ...rest] = value.split(/\s*(?:\||—|–)\s*/);
  return { title: title.trim(), detail: rest.join(' ').trim() };
};

/**
 * A merchant button link: store paths stay in the app, http(s) links open in
 * a new tab, anything else falls back to the catalog.
 */
export const resolveLink = (value, fallback) => {
  const url = safeUrl(value);
  if (!url) return { to: fallback, external: false };
  return url.startsWith('/') ? { to: url, external: false } : { to: url, external: true };
};

/** Normalized, render-safe Template 2 content. */
export const getTemplateContent = (content, categories = []) => {
  const text = (label) => contentText(getContentValue(content, label));
  const images = (label) => contentImages(getContentValue(content, label));

  const highlights = Array.from({ length: MAX_HIGHLIGHTS }, (_, index) => text(`Highlight ${index + 1}`))
    .filter(Boolean)
    .map(parseHighlight)
    .filter((item) => item.title);

  const needs = [
    ...new Set(
      text('Shop by Need')
        .split(/[,\n،]/)
        .map((word) => word.trim())
        .filter((word) => word && word.length <= MAX_NEED_LENGTH)
    ),
  ].slice(0, MAX_NEEDS);

  const featuredName = text('Featured Category').toLowerCase();
  const featuredCategory = featuredName
    ? categories.find((category) => String(category.name || '').trim().toLowerCase() === featuredName) || null
    : null;

  return {
    hero: {
      eyebrow: text('Hero Eyebrow'),
      buttonText: text('Hero Button Text'),
      note: text('Hero Note'),
    },
    highlights,
    feature: {
      eyebrow: text('Feature Eyebrow'),
      title: text('Feature Title'),
      text: text('Feature Text'),
      image: images('Feature Image')[0] || null,
      buttonText: text('Feature Button Text'),
      link: resolveLink(text('Feature Button Link'), '/products'),
      note: text('Feature Note'),
    },
    featured: {
      title: text('Featured Title'),
      category: featuredCategory,
    },
    needs: {
      title: text('Shop by Need Title'),
      items: needs,
    },
    story: {
      title: text('Story Title'),
      text: text('Story Text'),
      image: images('Story Image')[0] || null,
    },
  };
};
