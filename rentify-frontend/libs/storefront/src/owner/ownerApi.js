import { ECOMMERCE_API_ROOT, RENTIFY_API_BASE } from '@rentify/shared/config/urls';

/**
 * Owner-only calls from the storefront. Each one carries the owner's session
 * cookie; Core and Commerce check ownership or product permission themselves.
 */
const json = async (response) => {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || body.message || `Request failed (${response.status})`);
    error.body = body;
    throw error;
  }
  return body;
};

const site = (websiteId) => encodeURIComponent(websiteId);

/** Uploads one image to the store's media (Core) and returns its https URL. */
export const uploadStoreImage = async (websiteId, file) => {
  const body = new FormData();
  body.append('image', file);
  const result = await json(
    await fetch(`${RENTIFY_API_BASE}/api/websites/uploadImage/${site(websiteId)}`, { method: 'POST', credentials: 'include', body })
  );
  if (!result.url) throw new Error('Upload returned no URL');
  return result.url;
};

export const saveStorefrontContent = async (websiteId, fields) =>
  json(
    await fetch(`${RENTIFY_API_BASE}/api/websites/${site(websiteId)}/storefront-content`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    })
  );

/** The store type's extra product fields (e.g. skin type for skincare stores). */
export const getProductFormConfig = async (websiteId) =>
  json(await fetch(`${ECOMMERCE_API_ROOT}/api/product/${site(websiteId)}/manage/config`, { credentials: 'include' }));

export const createProduct = async (websiteId, product) =>
  json(
    await fetch(`${ECOMMERCE_API_ROOT}/api/product/${site(websiteId)}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    })
  );

export const createCategory = async (websiteId, category) =>
  json(
    await fetch(`${ECOMMERCE_API_ROOT}/api/categories/${site(websiteId)}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(category),
    })
  );
