const runtimeUrls = require('./runtimeUrls');
const allowedOrigins = [...new Set([
  runtimeUrls.authUrl,
  runtimeUrls.merchantDashboardUrl,
  runtimeUrls.marketingUrl,
  runtimeUrls.storefrontOrigin,
  ...(process.env.CORS_ALLOWED_ORIGINS || '').split(','),
].filter(Boolean).map((url) => url.trim().replace(/\/+$/, '')))];

module.exports = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalized = origin.replace(/\/+$/, '');
    if (allowedOrigins.includes(normalized)) {
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
