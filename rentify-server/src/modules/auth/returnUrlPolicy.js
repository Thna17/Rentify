const runtimeUrls = require("../../config/runtimeUrls");
const { isHostedStorefrontOrigin } = require('../../utils/hostedStorefrontOrigin');

const allowedOrigins = () => new Set([
  runtimeUrls.authUrl,
  runtimeUrls.marketingUrl,
  runtimeUrls.marketplaceUrl,
  runtimeUrls.merchantDashboardUrl,
  runtimeUrls.adminDashboardUrl,
  runtimeUrls.storefrontOrigin,
  ...(process.env.AUTH_RETURN_URL_ALLOWLIST || "").split(","),
].filter(Boolean).map((url) => new URL(url).origin));

const resolveReturnUrl = (candidate, fallback = runtimeUrls.marketingUrl) => {
  if (!candidate) return fallback;
  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    const error = new Error("Invalid return URL");
    error.statusCode = 400;
    throw error;
  }

  if (!allowedOrigins().has(parsed.origin) && !isHostedStorefrontOrigin(parsed.origin)) {
    const error = new Error("Return URL is not allowed");
    error.statusCode = 400;
    throw error;
  }
  return parsed.toString();
};

module.exports = { resolveReturnUrl, allowedOrigins };
