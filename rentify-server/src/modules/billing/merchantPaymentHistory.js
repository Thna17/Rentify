const { Payment } = require('../../models');
const { Op } = require('sequelize');
const { ApiError } = require('../../utils/errors');

function minorUnits(value, currency) {
  const scale = currency === 'USD' ? 2 : currency === 'KHR' ? 0 : null;
  if (scale === null) return null;
  const match = /^(\d+)(?:\.(\d+))?$/.exec(String(value));
  if (!match || (match[2] || '').length > scale) return null;
  const amount = BigInt(match[1]) * 10n ** BigInt(scale) + BigInt((match[2] || '').padEnd(scale, '0') || '0');
  return amount <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(amount) : null;
}
async function list(req, res) {
  if (!req.user?.id || !['user', 'admin'].includes(req.user.role)) throw ApiError.unauthorized();
  const rows = await Payment.findAll({ where: { userId: req.user.id, packageId: { [Op.ne]: null } },
    attributes: ['id', 'packageId', 'amount', 'currency', 'status', 'createdAt'],
    order: [['createdAt', 'DESC'], ['id', 'DESC']], limit: 50 });
  res.json({ data: rows.map((row) => ({ id: row.id, packageId: row.packageId, status: row.status,
    currency: row.currency, amountMinor: minorUnits(row.amount, row.currency), createdAt: row.createdAt,
    classification: 'subscription_payment' })) });
}
module.exports = { list, minorUnits };
