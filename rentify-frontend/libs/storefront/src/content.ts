/**
 * Read-only helpers for merchant website content (`WebsiteContents`).
 *
 * Content values are stored in several historical shapes: plain strings,
 * `{ text }` objects, arrays of URLs or `{ url }` objects. These helpers
 * normalize them and only ever return plain text or http(s) URLs, so templates
 * can render merchant content without HTML injection or `javascript:` links.
 */

export interface WebsiteContentItem {
  id?: string;
  category?: string;
  label?: string;
  type?: string;
  value?: unknown;
}

export interface StoreSocialLink {
  network: 'facebook' | 'instagram' | 'tiktok' | 'telegram' | 'youtube' | 'twitter' | 'linkedin';
  url: string;
}

/** Header artwork styles templates may offer; the first is the default. */
export const HEADER_STYLES = ['heritage', 'riverside', 'classic'] as const;
export type HeaderStyle = (typeof HEADER_STYLES)[number];

export interface StoreIdentity {
  name: string;
  headerStyle: HeaderStyle;
  logoUrl: string | null;
  heroHeadline: string;
  heroSubtitle: string;
  heroImages: string[];
  announcement: string;
  phone: string;
  email: string;
  location: string;
  copyright: string;
  socialLinks: StoreSocialLink[];
}

const SOCIAL_NETWORKS: StoreSocialLink['network'][] = [
  'facebook',
  'instagram',
  'tiktok',
  'telegram',
  'youtube',
  'twitter',
  'linkedin',
];

/** Accepts absolute http(s) URLs and same-origin paths; rejects everything else. */
export const safeUrl = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2048) return null;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  try {
    const url = new URL(trimmed);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
};

/** Extracts displayable text from a content value. */
export const contentText = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    for (const key of ['text', 'value', 'label', 'title']) {
      if (typeof record[key] === 'string') return (record[key] as string).trim();
    }
  }
  return '';
};

/** Extracts a list of safe image URLs from a content value. */
export const contentImages = (value: unknown): string[] => {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return list
    .map((item) =>
      typeof item === 'string'
        ? safeUrl(item)
        : item && typeof item === 'object'
          ? safeUrl((item as Record<string, unknown>).url)
          : null
    )
    .filter((url): url is string => Boolean(url));
};

const findContent = (content: WebsiteContentItem[], labels: string[]) => {
  const wanted = labels.map((label) => label.toLowerCase());
  return content.find((item) => wanted.includes(String(item.label || '').toLowerCase()));
};

export const getContentValue = (content: WebsiteContentItem[] | undefined, ...labels: string[]) =>
  findContent(Array.isArray(content) ? content : [], labels)?.value;

const socialLinks = (value: unknown): StoreSocialLink[] => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  const record = value as Record<string, unknown>;
  return SOCIAL_NETWORKS.flatMap((network) => {
    const url = safeUrl(record[network]);
    return url && /^https?:/.test(url) ? [{ network, url }] : [];
  });
};

/** Normalized, render-safe store identity derived from website content. */
export const getStoreIdentity = (
  content: WebsiteContentItem[] | undefined,
  fallbackName?: string | null,
  fallbackLogo?: string | null
): StoreIdentity => {
  const items = Array.isArray(content) ? content : [];
  const text = (...labels: string[]) => contentText(getContentValue(items, ...labels));

  const requestedStyle = text('Header Style').toLowerCase() as HeaderStyle;
  const storeName = text('Website Name', 'Site Title', 'Store Name') || fallbackName?.trim() || '';

  return {
    name: storeName,
    headerStyle: HEADER_STYLES.includes(requestedStyle) ? requestedStyle : HEADER_STYLES[0],
    logoUrl: contentImages(getContentValue(items, 'Logo', 'Store Logo'))[0] || safeUrl(fallbackLogo) || null,
    heroHeadline: text('Hero Headline', 'Hero Title'),
    heroSubtitle: text('Hero Subtitle', 'Hero Description'),
    heroImages: contentImages(getContentValue(items, 'Hero Image', 'Hero Images')),
    announcement: text('Announcement', 'Announcement Bar', 'Promotion'),
    phone: text('Phone Number', 'Phone'),
    email: text('Contact Email', 'Email'),
    location: text('Locations', 'Location', 'Address'),
    copyright: text('Copyright') || (storeName ? `© ${new Date().getFullYear()} ${storeName}. Powered by Rentify.` : ''),
    socialLinks: socialLinks(getContentValue(items, 'Social Media')),
  };
};
