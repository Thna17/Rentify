/**
 * Credentialed CORS for Rentify-hosted storefronts: single-label subdomains of
 * HOSTED_STOREFRONT_DOMAIN over HTTPS on the default port. Local development
 * may also set HOSTED_STOREFRONT_DEV_PORT (e.g. 4900) to allow
 * http://<store>.localhost:4900; it is ignored when NODE_ENV is production.
 * Keep in step with rentify-server/src/utils/hostedStorefrontOrigin.js.
 */
const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

const isHostedStorefrontOrigin = (value) => {
  const domain = (process.env.HOSTED_STOREFRONT_DOMAIN || '').toLowerCase().trim();
  if (!domain) return false;
  const devPort = process.env.NODE_ENV === 'production' ? '' : String(process.env.HOSTED_STOREFRONT_DEV_PORT || '').trim();
  try {
    const parsed = new URL(value);
    if (parsed.username || parsed.password) return false;
    const secure = parsed.protocol === 'https:' && !parsed.port;
    const local = Boolean(devPort) && parsed.protocol === 'http:' && parsed.port === devPort;
    if (!secure && !local) return false;
    if (!parsed.hostname.endsWith(`.${domain}`)) return false;
    const label = parsed.hostname.slice(0, -(domain.length + 1));
    // Labels used by other sites on the same domain are never storefronts.
    const reserved = String(process.env.HOSTED_STOREFRONT_RESERVED || '').split(',').map((item) => item.trim().toLowerCase());
    return LABEL.test(label) && !reserved.includes(label);
  } catch { return false; }
};

module.exports = { isHostedStorefrontOrigin };
