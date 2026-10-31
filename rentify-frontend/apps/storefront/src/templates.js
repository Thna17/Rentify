import { lazy } from 'react';
import { previewTemplateId } from '@rentify/storefront/preview';

/**
 * Templates this storefront can serve, keyed by `websiteTemplateId`. Each one
 * is its own chunk (with its own stylesheet), so a shopper downloads only the
 * template their store uses. Core's publish step accepts the same ids
 * (rentify-server/src/services/deploymentService.js).
 */
export const TEMPLATE_LOADERS = {
  1: () => import('../../templates/ecommerce/ecommerce-template-1/src/entry'),
  2: () => import('../../templates/ecommerce/ecommerce-template-2/src/entry'),
  3: () => import('../../templates/ecommerce/ecommerce-template-3/src/entry'),
  4: () => import('../../templates/ecommerce/ecommerce-template-4/src/entry'),
};

const lazyTemplates = {};

/**
 * The lazily loaded template component for a website, or null when unsupported.
 * The merchant's design preview (a framed `?previewTemplate=`) may ask for another
 * template; it only changes the look of this page view, never what is saved.
 */
export const templateFor = (website) => {
  if (!website) return null;
  const id = previewTemplateId() ?? Number(website.websiteTemplateId);
  const load = TEMPLATE_LOADERS[id];
  if (!load) return null;
  lazyTemplates[id] ??= lazy(load);
  return lazyTemplates[id];
};
