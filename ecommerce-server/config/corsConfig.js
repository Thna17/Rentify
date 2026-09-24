const normalize = (url) => url.trim().replace(/\/+$/, '');
const { isHostedStorefrontOrigin } = require('../utils/hostedStorefrontOrigin');
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

module.exports = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalized = normalize(origin);
    const isAllowed = allowedOrigins.some(url =>
      url === normalized
    );
    if (isAllowed || isHostedStorefrontOrigin(normalized)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Idempotency-Key', 'x-session-id', 'X-Session-Id'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  exposedHeaders: ['Set-Cookie'],
};
