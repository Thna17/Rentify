// rentify-server/src/utils/hostBoundary.js
// P2-HOST-003: Custom-domain boundary and host classification for Core API.
// Enforces that custom domains are browse-only in Release 1 (DEC-003).

const {
  isHostedStorefrontOrigin,
  hostedSubdomainFromHost,
  hostedStorefrontUrl,
  hostedStorefrontDomain,
} = require('./hostedStorefrontOrigin');
const runtimeUrls = require('../config/runtimeUrls');

const CENTRAL_PLATFORM_ORIGINS = [
  runtimeUrls.authUrl,
  runtimeUrls.marketingUrl,
  runtimeUrls.marketplaceUrl,
  runtimeUrls.merchantDashboardUrl,
  runtimeUrls.adminDashboardUrl,
  runtimeUrls.posUrl,
  runtimeUrls.storefrontOrigin,
  ...(process.env.CORS_ALLOWED_ORIGINS || '').split(','),
]
  .filter(Boolean)
  .map((u) => {
    try {
      return new URL(u).host.toLowerCase();
    } catch {
      return null;
    }
  })
  .filter(Boolean);

const CENTRAL_HOST_SET = new Set(CENTRAL_PLATFORM_ORIGINS);

/**
 * Extracts the trusted host from an HTTP request.
 * Strictly checks Origin, Referer, or Host header.
 * NEVER inspects request body or arbitrary client parameters.
 *
 * @param {import('express').Request} req
 * @returns {string|null} Normalized hostname (lowercase, no port)
 */
function extractHostFromRequest(req) {
  if (!req || typeof req.get !== 'function') return null;

  // 1. Origin header (browser CORS)
  const origin = req.get('origin');
  if (origin) {
    try {
      const parsed = new URL(origin);
      if (parsed.hostname) return parsed.hostname.toLowerCase();
    } catch {}
  }

  // 2. Referer header
  const referer = req.get('referer');
  if (referer) {
    try {
      const parsed = new URL(referer);
      if (parsed.hostname) return parsed.hostname.toLowerCase();
    } catch {}
  }

  // 3. Host header
  const host = req.get('host');
  if (host) {
    return host.split(':')[0].trim().toLowerCase();
  }

  return null;
}

/**
 * Classifies a hostname into its authoritative architectural context.
 *
 * @param {string} host
 * @param {object} [options]
 * @param {object} [options.website] Active Website record from DB if already loaded
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
function classifyHost(host, options = {}) {
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

  // 1. Check if it's an approved hosted storefront subdomain (<subdomain>.<HOSTED_STOREFRONT_DOMAIN>)
  const hostedSub = hostedSubdomainFromHost(normalized);
  if (hostedSub) {
    return {
      type: 'HOSTED_STOREFRONT',
      subdomain: hostedSub,
      hostedStorefrontUrl: hostedStorefrontUrl(hostedSub),
      isHosted: true,
      isCustom: false,
      isCentral: false,
      isAllowedBrowseOnly: false, // Hosted storefront has full checkout capabilities
    };
  }

  // 2. Check if it's a central platform host
  if (CENTRAL_HOST_SET.has(normalized)) {
    return {
      type: 'CENTRAL_PLATFORM',
      isHosted: false,
      isCustom: false,
      isCentral: true,
      isAllowedBrowseOnly: false,
    };
  }

  // 3. Check if it's an explicitly registered custom domain on the active website
  const website = options.website;
  if (website && website.domain) {
    const registeredDomain = website.domain.split(':')[0].trim().toLowerCase();
    if (normalized === registeredDomain && website.status === 'active') {
      const canonicalSubdomain = website.subdomain || null;
      return {
        type: 'CUSTOM_DOMAIN',
        subdomain: canonicalSubdomain,
        hostedStorefrontUrl: canonicalSubdomain ? hostedStorefrontUrl(canonicalSubdomain) : null,
        isHosted: false,
        isCustom: true,
        isCentral: false,
        isAllowedBrowseOnly: true, // Custom domains are strictly browse-only in Release 1 (DEC-003)
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
 * Sanitizes a redirection target to ensure it strictly redirects to the verified hosted origin.
 * Prevents open redirects, strips all tokens, PII, and unsafe query parameters.
 *
 * @param {string} subdomain Canonical store subdomain
 * @param {string} [path='/checkout'] Relative path on hosted storefront
 * @returns {string} Safe absolute URL
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
  classifyHost,
  buildSafeHostedRedirectUrl,
  CENTRAL_HOST_SET,
};
