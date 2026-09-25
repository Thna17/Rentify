/**
 * Serves the single storefront app for every store under the hosted domain,
 * e.g. https://aura-botanicals.mekhla.digital. The Worker route is the wildcard
 * `*.<domain>/*`, so any other proxied hostname on the domain (the API tunnel,
 * other sites) is passed straight through to its own origin.
 */
const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export const isStoreHost = (hostname, env) => {
  const domain = String(env.HOSTED_STOREFRONT_DOMAIN || '').toLowerCase();
  const host = String(hostname || '').toLowerCase();
  if (!domain || !host.endsWith(`.${domain}`)) return false;
  const label = host.slice(0, -(domain.length + 1));
  const reserved = String(env.HOSTED_STOREFRONT_RESERVED || '')
    .split(',')
    .map((item) => item.trim().toLowerCase());
  return LABEL.test(label) && !reserved.includes(label);
};

export default {
  async fetch(request, env) {
    const { hostname } = new URL(request.url);
    // Not a store: let the request continue to that hostname's own origin.
    if (!isStoreHost(hostname, env)) return fetch(request);
    // Static assets, with index.html for app routes such as /products.
    return env.ASSETS.fetch(request);
  },
};
