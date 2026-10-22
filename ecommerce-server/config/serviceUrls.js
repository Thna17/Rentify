const normalizeBaseUrl = (url) => {
  if (!url) return null;
  return url.replace(/\/+$/, "");
};

module.exports = {
  get RENTIFY_API_BASE() {
    return (
      normalizeBaseUrl(process.env.RENTIFY_API_URL) ||
      normalizeBaseUrl(process.env.RENTIFY_API) ||
      normalizeBaseUrl(process.env.RENTIFY_API_BASE) ||
      normalizeBaseUrl("http://localhost:3001")
    );
  },
  get ECOMMERCE_API_BASE() {
    return (
      normalizeBaseUrl(process.env.ECOMMERCE_API_URL) ||
      normalizeBaseUrl(process.env.ECOMMERCE_API_BASE) ||
      normalizeBaseUrl(`http://localhost:${process.env.PORT || 4001}`)
    );
  },
};
