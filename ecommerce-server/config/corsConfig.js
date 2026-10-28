const normalize = (url) => url.trim().replace(/\/+$/, '');
const { isHostedStorefrontOrigin, hostedStorefrontDomain } = require('../utils/hostedStorefrontOrigin');
const local = [
  'http://localhost:4300',
  'http://localhost:4400',
  'http://localhost:4200',
  'http://localhost:4500',
  'http://localhost:4700',
  'http://localhost:4800',
];
const allowedOrigins = [...new Set([
  process.env.AUTH_URL,
  process.env.MERCHANT_DASHBOARD_URL,
  process.env.MARKETING_URL,
  process.env.MARKETPLACE_URL,
  process.env.ADMIN_DASHBOARD_URL,
  process.env.STOREFRONT_ORIGIN,
  ...local,
  ...(process.env.CORS_ALLOWED_ORIGINS || '').split(','),
].filter(Boolean).map(normalize))];

const isRegisteredCustomDomain = async (normalizedOrigin) => {
  try {
    const parsed = new URL(normalizedOrigin);
    const host = parsed.hostname.toLowerCase();
    const parent = hostedStorefrontDomain();
    if (parent && host.endsWith(`.${parent}`)) return false;
    const { WebsiteData } = require('../models');
    if (!WebsiteData) return false;
    const site = await WebsiteData.findOne({
      where: { domain: host, status: 'active' },
      attributes: ['id', 'domain', 'status'],
    });
    return Boolean(site);
  } catch {
    return false;
  }
};

module.exports = {
  origin: async (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalized = normalize(origin);
    const isAllowed = allowedOrigins.some(url =>
      url === normalized
    );
    if (isAllowed || isHostedStorefrontOrigin(normalized)) {
      return callback(null, true);
    }
    const isCustom = await isRegisteredCustomDomain(normalized);
    if (isCustom) {
      return callback(null, true);
    }
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Idempotency-Key', 'x-session-id', 'X-Session-Id', 'X-Correlation-ID'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  exposedHeaders: ['Set-Cookie', 'X-Correlation-ID'],
};
