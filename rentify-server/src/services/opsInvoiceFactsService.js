const axios = require("axios");
const { logger } = require("../utils/logger");
const { ecommerceApiUrl } = require("../config/runtimeUrls");

const ECOMMERCE_API = ecommerceApiUrl;
const OPS_TOKEN = process.env.OPS_TOKEN || "";

const cacheStore = new Map();

const buildCacheKey = (params) => JSON.stringify(params);

const getCached = (key) => {
  const entry = cacheStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cacheStore.delete(key);
    return null;
  }
  return entry.data;
};

const setCached = (key, data, ttlMs = 60 * 1000) => {
  cacheStore.set(key, { data, expiresAt: Date.now() + ttlMs });
};

const fetchInvoiceFacts = async ({ websiteId, from, to }) => {
  const cacheKey = buildCacheKey({ websiteId, from, to });
  const cached = getCached(cacheKey);
  if (cached) return cached;

  if (!OPS_TOKEN) {
    logger.warn("OPS_TOKEN not set - cannot fetch invoice facts");
    return [];
  }

  try {
    const response = await axios.get(
      `${ECOMMERCE_API}/api/ops/invoices/facts`,
      {
        headers: { "x-ops-token": OPS_TOKEN },
        params: {
          websiteId,
          from,
          to,
        },
        timeout: 15000,
      }
    );

    const data = response.data?.invoices || [];
    setCached(cacheKey, data, 120 * 1000);
    return data;
  } catch (error) {
    logger.error("Failed to fetch invoice facts", {
      error: error.message,
    });
    return [];
  }
};

module.exports = {
  fetchInvoiceFacts,
};
