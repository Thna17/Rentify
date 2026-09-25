/**
 * What the store owner can edit on Template 1 from the live storefront
 * (owner tools in @rentify/storefront/owner). Core allowlists the same labels in
 * rentify-server/src/config/storefrontContentFields.js.
 */
export const TEMPLATE_1_FIELDS = [
  { category: 'Header', label: 'Announcement', type: 'text', hint: 'Short message shown in a bar above the header' },
  { category: 'Hero', label: 'Hero Headline', type: 'text', hint: 'Read by search engines and screen readers; the store name is used when empty' },
  { category: 'Hero', label: 'Hero Subtitle', type: 'text', multiline: true, hint: 'One or two sentences about the store' },
  { category: 'Hero', label: 'Hero Image', type: 'image', multiple: true, max: 6, hint: 'Wide banner photos; several images rotate' },
];
