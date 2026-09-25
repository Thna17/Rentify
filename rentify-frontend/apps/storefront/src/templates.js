import { lazy } from 'react';

/**
 * Templates this storefront can serve, keyed by `websiteTemplateId`. Each one
 * is its own chunk (with its own stylesheet), so a shopper downloads only the
 * template their store uses. Core's publish step accepts the same ids
 * (rentify-server/src/services/deploymentService.js).
 */
export const TEMPLATE_LOADERS = {
  1: () => import('../../templates/ecommerce/ecommerce-template-1/src/entry'),
  2: () => import('../../templates/ecommerce/ecommerce-template-2/src/entry'),
};

const lazyTemplates = {};

/** The lazily loaded template component for a website, or null when unsupported. */
export const templateFor = (website) => {
  const id = Number(website?.websiteTemplateId);
  const load = TEMPLATE_LOADERS[id];
  if (!load) return null;
  lazyTemplates[id] ??= lazy(load);
  return lazyTemplates[id];
};
