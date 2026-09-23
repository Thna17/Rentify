const normalizeBaseUrl = (url) => {
  if (!url) return null;
  return url.replace(/\/+$/, "");
};

const RENTIFY_API_BASE =
  normalizeBaseUrl(process.env.RENTIFY_API_URL) ||
  normalizeBaseUrl(process.env.RENTIFY_API) ||
  normalizeBaseUrl(process.env.RENTIFY_API_BASE) ||
  normalizeBaseUrl("http://localhost:3001");

const ECOMMERCE_API_BASE =
  normalizeBaseUrl(process.env.ECOMMERCE_API_URL) ||
  normalizeBaseUrl(process.env.ECOMMERCE_API_BASE) ||
  normalizeBaseUrl(`http://localhost:${process.env.PORT || 4001}`);

module.exports = {
  RENTIFY_API_BASE,
  ECOMMERCE_API_BASE,
};
