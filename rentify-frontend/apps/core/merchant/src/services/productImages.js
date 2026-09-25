import { RENTIFY_API_BASE } from '@rentify/shared/config/urls';

export const MAX_PRODUCT_IMAGES = 10;
export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;
export const PRODUCT_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

export function selectProductImages(files, currentCount = 0) {
  const accepted = [];
  const rejected = [];
  const remaining = Math.max(0, MAX_PRODUCT_IMAGES - currentCount);

  for (const file of Array.from(files || [])) {
    if (!PRODUCT_IMAGE_TYPES.includes(file.type)) {
      rejected.push(`${file.name}: use JPG, PNG, WebP, or GIF.`);
    } else if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
      rejected.push(`${file.name}: maximum size is 5 MB.`);
    } else if (accepted.length >= remaining) {
      rejected.push(`You can add up to ${MAX_PRODUCT_IMAGES} product images.`);
      break;
    } else {
      accepted.push(file);
    }
  }

  return { accepted, rejected };
}

export function uploadProductImages({ files, websiteId, storeId, onProgress }) {
  if (!files?.length) return Promise.resolve([]);
  if (!websiteId && !storeId) return Promise.reject(new Error('Store identity is missing. Refresh and try again.'));

  const tenantPath = websiteId
    ? `/api/websites/${encodeURIComponent(websiteId)}/product-images`
    : `/api/stores/${encodeURIComponent(storeId)}/product-images`;
  const formData = new FormData();
  files.forEach((file) => formData.append('images', file));

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', `${RENTIFY_API_BASE}${tenantPath}`);
    request.withCredentials = true;
    request.timeout = 90_000;

    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener('load', () => {
      let body = {};
      try { body = JSON.parse(request.responseText || '{}'); } catch { /* use fallback below */ }
      if (request.status >= 200 && request.status < 300) {
        resolve(body.images || []);
      } else {
        reject(new Error(body.error || body.message || 'Images could not be uploaded.'));
      }
    });
    request.addEventListener('error', () => reject(new Error('Could not reach image storage. Check your connection and retry.')));
    request.addEventListener('timeout', () => reject(new Error('Image upload timed out. Try fewer or smaller images.')));
    request.send(formData);
  });
}
