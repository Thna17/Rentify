const crypto = require("crypto");

const requireServiceToken = (req, res, next) => {
  const expected = process.env.SERVICE_TO_SERVICE_TOKEN;
  const supplied = req.get("x-rentify-service-token");
  const expectedBuffer = Buffer.from(expected || "");
  const suppliedBuffer = Buffer.from(supplied || "");

  if (!expected) return res.status(503).json({ error: "Service authentication is not configured" });
  if (expectedBuffer.length !== suppliedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)) {
    return res.status(401).json({ error: "Unauthorized service request" });
  }
  return next();
};

module.exports = { requireServiceToken };
