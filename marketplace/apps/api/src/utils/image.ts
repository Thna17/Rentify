import { Jimp } from 'jimp';

/**
 * Downscales and recompresses a base64 image data URI before it ever
 * reaches the database.
 *
 * There is no file-hosting/CDN in this deployment, so a seller's photo
 * upload gets embedded as base64 directly on the Product/Store document —
 * and the catalog list endpoints return that same field for every item on
 * the page. An un-resized phone photo (often 200-350KB) times 40-60
 * products turned a single "browse products" request into an 11MB, 70+
 * second response. A list view never needs more than a few hundred pixels
 * across, so every image is capped here regardless of what was uploaded.
 *
 * Anything that isn't a data URI (a real hosted `https://...` URL, or
 * nothing at all) is returned untouched — only base64 payloads this
 * deployment is actually responsible for storing get resized.
 */
export async function compressImage(
  value: string | undefined,
  maxWidth = 640,
): Promise<string | undefined> {
  if (!value || !value.startsWith('data:image/')) {
    return value;
  }

  try {
    const image = await Jimp.read(Buffer.from(value.split(',')[1] ?? '', 'base64'));
    if (image.bitmap.width > maxWidth) {
      image.resize({ w: maxWidth });
    }
    const buffer = await image.getBuffer('image/jpeg', { quality: 70 });
    return `data:image/jpeg;base64,${buffer.toString('base64')}`;
  } catch {
    // A malformed or unusual data URI is left as-is rather than dropped —
    // worst case it stays large, which is the status quo, not a new bug.
    return value;
  }
}

export async function compressImages(
  values: string[] | undefined,
  maxWidth = 640,
): Promise<string[] | undefined> {
  if (!values) return values;
  return Promise.all(values.map((value) => compressImage(value, maxWidth) as Promise<string>));
}

const THUMBNAIL_WIDTH = 220;

/**
 * The full-size image and a small thumbnail from one decode — a product
 * list page (60+ cards at once) uses the thumbnail; only that one
 * product's own detail page needs the full-size copy. Decoding the source
 * once and resizing twice avoids paying the (much heavier) JPEG decode
 * cost a second time just to produce the smaller variant.
 */
export async function compressImageWithThumbnail(
  value: string | undefined,
  maxWidth = 640,
): Promise<{ image: string | undefined; thumbnail: string | undefined }> {
  if (!value || !value.startsWith('data:image/')) {
    return { image: value, thumbnail: value };
  }

  try {
    const source = await Jimp.read(Buffer.from(value.split(',')[1] ?? '', 'base64'));

    const full = source.clone();
    if (full.bitmap.width > maxWidth) full.resize({ w: maxWidth });
    const fullBuffer = await full.getBuffer('image/jpeg', { quality: 70 });

    const thumb = source.clone();
    if (thumb.bitmap.width > THUMBNAIL_WIDTH) thumb.resize({ w: THUMBNAIL_WIDTH });
    const thumbBuffer = await thumb.getBuffer('image/jpeg', { quality: 60 });

    return {
      image: `data:image/jpeg;base64,${fullBuffer.toString('base64')}`,
      thumbnail: `data:image/jpeg;base64,${thumbBuffer.toString('base64')}`,
    };
  } catch {
    return { image: value, thumbnail: value };
  }
}
