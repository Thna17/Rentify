const axios = require('axios');

// A successful HTTP response or a conflict does not prove the payment outcome.
// Always query again after cancellation and return unknown when evidence is incomplete.
async function getCutluyFinalStatus({ providerPaymentId, apiKey, reason }) {
  const base = (process.env.CUTLUY_API_BASE_URL || 'https://cutluy.com').replace(/\/+$/, '');
  const url = `${base}/v1/payments/${encodeURIComponent(providerPaymentId)}`;
  const options = { headers: { Authorization: `Bearer ${apiKey}`, 'User-Agent': 'Rentify/1.0 (axios)' }, timeout: 6000 };
  const read = async () => {
    const response = await axios.get(url, options);
    const data = response.data?.data || response.data;
    return { status: String(data?.status || '').toLowerCase(), data };
  };
  try {
    let result = await read();
    if (result.status === 'pending') {
      try { await axios.post(`${url}/cancel`, { reason }, options); }
      catch (error) { if (error.response?.status !== 409) return { status: 'unknown' }; }
      result = await read();
    }
    if (['paid', 'completed', 'cancelled', 'expired', 'failed'].includes(result.status)) return result;
  } catch { /* An unavailable provider or an unrecognized response is inconclusive. */ }
  return { status: 'unknown' };
}
module.exports = { getCutluyFinalStatus };
