// modules/payments/paymentUtils.js
// DEC-029: Stable payment contract normalization across all surfaces

function normalizePaymentMethod(method) {
  if (!method) return 'COD';
  const m = String(method).trim().toUpperCase();
  if (m === 'CUTLUY' || m === 'KHQR') return 'KHQR';
  if (m === 'CASH') return 'CASH';
  if (m === 'COD') return 'COD';
  return m;
}

function normalizePaymentStatus(status) {
  if (!status) return 'pending';
  const s = String(status).trim().toLowerCase();
  if (s === 'completed' || s === 'paid') return 'paid';
  if (s === 'failed') return 'failed';
  if (s === 'expired') return 'expired';
  return s;
}

module.exports = {
  normalizePaymentMethod,
  normalizePaymentStatus,
};
