// ecommerce-server/utils/hostBoundary.js
// P2-HOST-003: Custom-domain boundary and host classification for Commerce API.
// Enforces browse-only behavior for custom merchant domains in Release 1 (DEC-003).

const {
  isHostedStorefrontOrigin,
  hostedSubdomainFromHost,
  hostedStorefrontUrl,
} = require('./hostedStorefrontOrigin');

const local = [
  'http://localhost:4300',
  'http://localhost:4400',
  'http://localhost:4200',
  'http://localhost:4500',
  'http://localhost:4700',
  'http://localhost:4800',
];

const platformUrls = [
  process.env.AUTH_URL,
  process.env.MERCHANT_DASHBOARD_URL,
  process.env.MARKETING_URL,
  process.env.MARKETPLACE_URL,
  process.env.ADMIN_DASHBOARD_URL,
  process.env.STOREFRONT_ORIGIN,
  ...local,
  ...(process.env.CORS_ALLOWED_ORIGINS || '').split(','),
];

const CENTRAL_HOSTS = new Set(
  platformUrls
    .filter(Boolean)
    .map((u) => {
      try {
        return new URL(u).host.toLowerCase();
      } catch {
        return null;
      }
    })
    .filter(Boolean)
);

/**
 * Extracts host from request Origin, Referer, or Host header.
 * NEVER reads request body or parameters.
 *
 * @param {import('express').Request} req
 * @returns {string|null} Normalized host
 */
function extractHostFromRequest(req) {
  if (!req || typeof req.get !== 'function') return null;

  const origin = req.get('origin');
  if (origin) {
    try {
      const parsed = new URL(origin);
      if (parsed.hostname) return parsed.hostname.toLowerCase();
    } catch {}
  }

  const referer = req.get('referer');
  if (referer) {
    try {
      const parsed = new URL(referer);
      if (parsed.hostname) return parsed.hostname.toLowerCase();
    } catch {}
  }

  const host = req.get('host');
  if (host) {
    return host.split(':')[0].trim().toLowerCase();
  }

  return null;
}

/**
 * Classifies the incoming host.
 *
 * @param {string} host
 * @param {object} [options]
 * @param {object} [options.website] Active WebsiteData record if resolved
 * @returns {{
 *   type: 'HOSTED_STOREFRONT' | 'CUSTOM_DOMAIN' | 'CENTRAL_PLATFORM' | 'UNREGISTERED',
 *   subdomain?: string | null,
 *   hostedStorefrontUrl?: string | null,
 *   isHosted: boolean,
 *   isCustom: boolean,
 *   isCentral: boolean,
 *   isAllowedBrowseOnly: boolean
 * }}
 */
function classifyCommerceHost(host, options = {}) {
  if (!host || typeof host !== 'string') {
    return {
      type: 'UNREGISTERED',
      isHosted: false,
      isCustom: false,
      isCentral: false,
      isAllowedBrowseOnly: false,
    };
  }

  const normalized = host.split(':')[0].trim().toLowerCase();

  // 1. Approved single-label hosted storefront subdomain
  const hostedSub = hostedSubdomainFromHost(normalized);
  if (hostedSub) {
    return {
      type: 'HOSTED_STOREFRONT',
      subdomain: hostedSub,
      hostedStorefrontUrl: hostedStorefrontUrl(hostedSub),
      isHosted: true,
      isCustom: false,
      isCentral: false,
      isAllowedBrowseOnly: false,
    };
  }

  // 2. Central platform
  if (CENTRAL_HOSTS.has(normalized)) {
    return {
      type: 'CENTRAL_PLATFORM',
      isHosted: false,
      isCustom: false,
      isCentral: true,
      isAllowedBrowseOnly: false,
    };
  }

  // 3. Registered custom domain on active website
  const website = options.website;
  if (website && website.domain) {
    const regDomain = website.domain.split(':')[0].trim().toLowerCase();
    if (normalized === regDomain && website.status === 'active') {
      const canonicalSubdomain = website.subdomain || null;
      return {
        type: 'CUSTOM_DOMAIN',
        subdomain: canonicalSubdomain,
        hostedStorefrontUrl: canonicalSubdomain ? hostedStorefrontUrl(canonicalSubdomain) : null,
        isHosted: false,
        isCustom: true,
        isCentral: false,
        isAllowedBrowseOnly: true,
      };
    }
  }

  return {
    type: 'UNREGISTERED',
    isHosted: false,
    isCustom: false,
    isCentral: false,
    isAllowedBrowseOnly: false,
  };
}

/**
 * Builds safe redirect URL to the hosted storefront domain.
 */
function buildSafeHostedRedirectUrl(subdomain, path = '/checkout') {
  const baseUrl = hostedStorefrontUrl(subdomain);
  if (!baseUrl) {
    throw new Error(`Cannot build hosted redirect: invalid or unconfigured subdomain "${subdomain}"`);
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  // Strip any query strings, hashes, path traversals and collapse multiple slashes
  const normalizedPath = cleanPath
    .split('?')[0]
    .split('#')[0]
    .replace(/\.\./g, '')
    .replace(/\/+/g, '/');
  return `${baseUrl}${normalizedPath}`;
}

module.exports = {
  extractHostFromRequest,
  classifyCommerceHost,
  buildSafeHostedRedirectUrl,
  CENTRAL_HOSTS,
};
