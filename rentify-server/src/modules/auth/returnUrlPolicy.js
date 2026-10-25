const runtimeUrls = require("../../config/runtimeUrls");
const { isHostedStorefrontOrigin } = require('../../utils/hostedStorefrontOrigin');

const allowedOrigins = () => new Set([
  runtimeUrls.authUrl,
  runtimeUrls.marketingUrl,
  runtimeUrls.marketplaceUrl,
  runtimeUrls.merchantDashboardUrl,
  runtimeUrls.adminDashboardUrl,
  runtimeUrls.posUrl,
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

  // Prevent credentials in URL
  if (parsed.username || parsed.password) {
    const error = new Error("Return URL must not contain credentials");
    error.statusCode = 400;
    throw error;
  }

  // Prevent open-redirect payloads via query parameters
  const redirectParam = parsed.searchParams.get('redirect') ||
    parsed.searchParams.get('returnUrl') ||
    parsed.searchParams.get('next') ||
    parsed.searchParams.get('url');
  if (redirectParam) {
    let nested;
    try {
      nested = new URL(redirectParam, parsed.origin);
    } catch {
      nested = null;
    }
    if (nested && nested.origin !== parsed.origin) {
      const error = new Error("Nested open redirect detected");
      error.statusCode = 400;
      throw error;
    }
  }

  if (!allowedOrigins().has(parsed.origin) && !isHostedStorefrontOrigin(parsed.origin)) {
    const error = new Error("Return URL is not allowed");
    error.statusCode = 400;
    throw error;
  }
  return parsed.toString();
};

module.exports = { resolveReturnUrl, allowedOrigins };
