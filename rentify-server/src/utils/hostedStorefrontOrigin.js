/**
 * Rentify-hosted storefront addresses: one subdomain per published Website
 * under HOSTED_STOREFRONT_DOMAIN, e.g. https://aura-botanicals.rentifystore.shop.
 *
 * Production accepts HTTPS on the default port only. Local development may set
 * HOSTED_STOREFRONT_DOMAIN=localhost and HOSTED_STOREFRONT_DEV_PORT=4900 so the
 * single storefront dev server answers http://aura-botanicals.localhost:4900;
 * the dev port is ignored when NODE_ENV is production.
 */

// One DNS label: lowercase letters, digits and inner hyphens, 1-63 characters.
const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

const hostedStorefrontDomain = () => (process.env.HOSTED_STOREFRONT_DOMAIN || '').toLowerCase().trim();

/**
 * Labels under the hosted domain that belong to something else (for example
 * other sites on the same domain). They are never assigned to a store, never
 * resolved to one, and never accepted as a storefront origin.
 */
const reservedHostedSubdomains = () =>
  new Set(
    String(process.env.HOSTED_STOREFRONT_RESERVED || '')
      .split(',')
      .map((label) => label.trim().toLowerCase())
      .filter(Boolean)
  );

const hostedStorefrontDevPort = () =>
  process.env.NODE_ENV === 'production' ? '' : String(process.env.HOSTED_STOREFRONT_DEV_PORT || '').trim();

/** The subdomain label of a hosted storefront hostname, or null. */
const hostedSubdomainFromHostname = (hostname) => {
  const domain = hostedStorefrontDomain();
  const host = String(hostname || '').toLowerCase().trim();
  if (!domain || !host.endsWith(`.${domain}`)) return null;
  const label = host.slice(0, -(domain.length + 1));
  return LABEL.test(label) && !reservedHostedSubdomains().has(label) ? label : null;
};

/** Same as above for a `host[:port]` value such as the storefront's window.location.host. */
const hostedSubdomainFromHost = (host) => hostedSubdomainFromHostname(String(host || '').replace(/:\d+$/, ''));

const isHostedStorefrontOrigin = (value) => {
  if (!hostedStorefrontDomain()) return false;
  try {
    const parsed = new URL(value);
    if (parsed.username || parsed.password) return false;
    const devPort = hostedStorefrontDevPort();
    const secure = parsed.protocol === 'https:' && !parsed.port;
    const local = Boolean(devPort) && parsed.protocol === 'http:' && parsed.port === devPort;
    if (!secure && !local) return false;
    return hostedSubdomainFromHostname(parsed.hostname) !== null;
  } catch {
    return false;
  }
};

/** Public URL of a hosted storefront, or null when hosting is not configured. */
const hostedStorefrontUrl = (subdomain) => {
  const domain = hostedStorefrontDomain();
  if (!domain || !LABEL.test(String(subdomain || '')) || reservedHostedSubdomains().has(subdomain)) return null;
  const devPort = hostedStorefrontDevPort();
  return devPort ? `http://${subdomain}.${domain}:${devPort}` : `https://${subdomain}.${domain}`;
};

module.exports = {
  isHostedStorefrontOrigin,
  hostedStorefrontDomain,
  hostedStorefrontUrl,
  hostedSubdomainFromHost,
  hostedSubdomainFromHostname,
  reservedHostedSubdomains,
};
