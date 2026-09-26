const crypto = require('crypto');

// Compares in constant time so response timing does not reveal the secret.
const sameSecret = (provided, expected) => {
  const a = Buffer.from(String(provided));
  const b = Buffer.from(String(expected));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// Shared-secret guard for the internal service-to-service routes. The
// Commerce API sends this header on every internal call; a mismatched or
// missing secret is refused rather than treated as a public request.
const verifyInternalService = (req, res, next) => {
  const expected = process.env.INTERNAL_SERVICE_SECRET;
  const provided = req.headers['x-internal-secret'];

  if (!expected) {
    return res.status(500).json({ message: 'INTERNAL_SERVICE_SECRET is not configured' });
  }
  if (!provided || !sameSecret(provided, expected)) {
    return res.status(401).json({ message: 'Invalid internal service secret' });
  }
  next();
};

module.exports = { verifyInternalService };
