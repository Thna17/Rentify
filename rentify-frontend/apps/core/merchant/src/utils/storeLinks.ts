import { HOSTED_STOREFRONT_DOMAIN, MARKETPLACE_URL, POS_URL } from '@rentify/shared/config/urls';

type StoreLike = { id?: string; name?: string; slug?: string; websiteDomain?: string } | null | undefined;

const slugify = (value?: string) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'store-name';

/** New Stores get "store-<uuid>" as their slug; that is an id, not a name to show or link by. */
const realSlug = (store: StoreLike) => {
  const raw = String(store?.slug || '').trim();
  return raw && !/^store-[0-9a-f-]{20,}$/i.test(raw) ? raw : '';
};

/** The Store's page on Rentify Market. */
export const marketplaceStoreUrl = (store: StoreLike) =>
  `${(MARKETPLACE_URL || 'https://rentify-market.mekhla.digital').replace(/\/+$/, '')}/stores/${realSlug(store) || store?.id || slugify(store?.name)}`;

/** The Store's online store address (hosted subdomain or its own domain). */
export const storefrontDomain = (store: StoreLike) =>
  store?.websiteDomain || `${realSlug(store) || slugify(store?.name)}.${HOSTED_STOREFRONT_DOMAIN || 'mekhla.digital'}`;

export const storefrontUrl = (store: StoreLike) => {
  const domain = storefrontDomain(store);
  if (/^https?:\/\//.test(domain)) return domain;
  return `${/localhost|127\.0\.0\.1/.test(domain) ? 'http' : 'https'}://${domain}`;
};

/** The separate POS register app. */
export const posAppUrl = () =>
  typeof window !== 'undefined' && window.location.hostname.includes('mekhla.digital') ? 'https://rentify-pos.mekhla.digital' : POS_URL;

export const openPosApp = () => {
  try {
    localStorage.setItem('rentify_pos_visited', 'true');
  } catch {
    // ignore storage errors
  }
  window.open(posAppUrl(), '_blank', 'noopener,noreferrer');
};
