const crypto = require("crypto");

const safeEqual = (left, right) => {
  const leftBuffer = Buffer.from(left || "");
  const rightBuffer = Buffer.from(right || "");
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const requireServiceToken = (req, res, next) => {
  const expectedToken = process.env.SERVICE_TO_SERVICE_TOKEN;
  const suppliedToken = req.get("x-rentify-service-token");

  if (!expectedToken) {
    return res.status(503).json({ error: "Service synchronization is not configured" });
  }
  if (!safeEqual(suppliedToken, expectedToken)) {
    return res.status(401).json({ error: "Unauthorized service request" });
  }
  return next();
};

module.exports = { requireServiceToken, safeEqual };
