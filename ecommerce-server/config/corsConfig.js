const normalize = (url) => url.trim().replace(/\/+$/, '');
const allowedOrigins = [...new Set([
  process.env.AUTH_URL,
  process.env.MERCHANT_DASHBOARD_URL,
  process.env.MARKETING_URL,
  process.env.STOREFRONT_ORIGIN,
  ...(process.env.CORS_ALLOWED_ORIGINS || '').split(','),
].filter(Boolean).map(normalize))];

module.exports = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalized = normalize(origin);
    const isAllowed = allowedOrigins.some(url =>
      url === normalized
    );
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  exposedHeaders: ['Set-Cookie'],
};
