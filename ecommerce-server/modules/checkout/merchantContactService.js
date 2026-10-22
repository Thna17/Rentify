const serviceUrls = require('../../config/serviceUrls');
const { getCorrelationId } = require('../../utils/logger');

const REQUEST_TIMEOUT_MS = 5000;

async function callInternal(path) {
  const secret = process.env.INTERNAL_SERVICE_SECRET;
  if (!secret) {
    console.error('INTERNAL_SERVICE_SECRET is not set — cannot reach Core for merchant contact info');
    return null;
  }
  try {
    const headers = { 'x-internal-secret': secret };
    const correlationId = getCorrelationId();
    if (correlationId) {
      headers['x-correlation-id'] = correlationId;
    }
    const response = await fetch(`${serviceUrls.RENTIFY_API_BASE}${path}`, {
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const body = await response.json().catch(() => null);
    return body?.data || null;
  } catch (error) {
    console.error(`Merchant contact lookup failed (${path}):`, error.message);
    return null;
  }
}

/** Owner contact for a marketplace store: { id, name, email, phoneNumber, telegramChatId } | null */
const getStoreOwnerContact = (storeId) => callInternal(`/api/internal/store-owner/${storeId}`);

/** Owner contact for a storefront website: { id, name, email, phoneNumber, telegramChatId } | null */
const getWebsiteOwnerContact = (websiteId) => callInternal(`/api/internal/website-owner/${websiteId}`);

module.exports = { getStoreOwnerContact, getWebsiteOwnerContact };
