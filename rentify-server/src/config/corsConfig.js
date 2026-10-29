const runtimeUrls = require('./runtimeUrls');
const { isHostedStorefrontOrigin, hostedStorefrontDomain } = require('../utils/hostedStorefrontOrigin');
const allowedOrigins = [...new Set([
  runtimeUrls.authUrl,
  runtimeUrls.merchantDashboardUrl,
  runtimeUrls.marketingUrl,
  runtimeUrls.marketplaceUrl,
  runtimeUrls.adminDashboardUrl,
  runtimeUrls.posUrl,
  runtimeUrls.storefrontOrigin,
  ...(process.env.CORS_ALLOWED_ORIGINS || '').split(','),
].filter(Boolean).map((url) => url.trim().replace(/\/+$/, '')))];

const isRegisteredCustomDomain = async (normalizedOrigin) => {
  try {
    const parsed = new URL(normalizedOrigin);
    const host = parsed.hostname.toLowerCase();
    const parent = hostedStorefrontDomain();
    if (parent && host.endsWith(`.${parent}`)) return false;
    const { Website } = require('../models');
    if (!Website) return false;
    const website = await Website.findOne({
      where: { domain: host, status: 'active' },
      attributes: ['id', 'domain', 'status'],
    });
    return Boolean(website);
  } catch {
    return false;
  }
};

module.exports = {
  origin: async (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalized = origin.replace(/\/+$/, '');
    if (allowedOrigins.includes(normalized) || isHostedStorefrontOrigin(normalized)) {
      return callback(null, true);
    }
    const isCustom = await isRegisteredCustomDomain(normalized);
    if (isCustom) {
      return callback(null, true);
    }
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-session-id', 'X-Session-Id', 'X-Correlation-ID'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  exposedHeaders: ['Set-Cookie', 'X-Correlation-ID'],
};
