'use strict';

// rentify-server/src/modules/billing/cutluyPaymentService.js
// P3-PAY-002: Idempotent Payment Creation Service.
// Creates canonical PaymentAttempts with stable business references and provider-neutral adapter delegation.

const { randomUUID } = require('node:crypto');
const { PaymentAttempt } = require('../../models');
const { cutluyAdapter } = require('./cutluyAdapter');
const { CUTLUY_ERROR_CODES, CutLuyError } = require('./cutluyErrors');

async function createPaymentAttempt({
  businessReference,
  businessType = 'subscription',
  accountType = 'subscription',
  accountRef,
  amount,
  currency = 'USD',
  idempotencyKey,
  returnUrl,
  cancelUrl,
  metadata = {},
  adapter = cutluyAdapter,
  transaction: parentTx,
  simulatedError = null,
} = {}) {
  // 1. Parameter validations
  if (!businessReference || typeof businessReference !== 'string' || !businessReference.trim()) {
    throw new CutLuyError(CUTLUY_ERROR_CODES.CLIENT_ERROR, 'businessReference is required', 400);
  }
  if (!idempotencyKey || typeof idempotencyKey !== 'string' || !idempotencyKey.trim()) {
    throw new CutLuyError(CUTLUY_ERROR_CODES.CLIENT_ERROR, 'idempotencyKey is required', 400);
  }

  // 2. Currency check: USD only; KHR strictly rejected without conversion
  const normCurrency = String(currency || '').trim().toUpperCase();
  if (normCurrency === 'KHR') {
    throw new CutLuyError(
      CUTLUY_ERROR_CODES.KHR_CURRENCY_NOT_SUPPORTED,
      'CutLuy operates with USD only. KHR currency conversion is not supported.',
      400
    );
  }
  if (normCurrency !== 'USD') {
    throw new CutLuyError(
      CUTLUY_ERROR_CODES.UNSUPPORTED_CURRENCY,
      `Unsupported currency: "${currency}". USD is required.`,
      400
    );
  }

  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    throw new CutLuyError(
      CUTLUY_ERROR_CODES.INVALID_AMOUNT,
      `Amount must be a positive number in USD: ${amount}`,
      400
    );
  }
  const formattedAmount = numAmount.toFixed(2);
  const trimmedRef = businessReference.trim();
  const trimmedKey = idempotencyKey.trim();

  // 3. Idempotency Check on PaymentAttempt
  const existing = await PaymentAttempt.findOne({
    where: { idempotencyKey: trimmedKey },
    transaction: parentTx,
  });

  if (existing) {
    const amountMatches = Number(existing.amount).toFixed(2) === formattedAmount;
    const refMatches = existing.businessReference === trimmedRef;
    const currencyMatches = existing.currency === 'USD';
    const accountMatches = existing.accountRef === accountRef;

    if (!amountMatches || !refMatches || !currencyMatches || !accountMatches) {
      throw new CutLuyError(
        CUTLUY_ERROR_CODES.IDEMPOTENCY_CONFLICT,
        `Idempotency key "${trimmedKey}" was already used with conflicting parameters`,
        409,
        {
          existing: {
            businessReference: existing.businessReference,
            amount: existing.amount,
            currency: existing.currency,
            accountRef: existing.accountRef,
          },
          requested: {
            businessReference: trimmedRef,
            amount: formattedAmount,
            currency: 'USD',
            accountRef,
          },
        }
      );
    }

    return { duplicate: true, attempt: existing };
  }

  // 4. Delegate to provider adapter port
  const providerResult = await adapter.createPayment({
    accountRef,
    accountType,
    amount: formattedAmount,
    currency: 'USD',
    referenceId: trimmedRef,
    idempotencyKey: trimmedKey,
    returnUrl,
    cancelUrl,
    metadata,
    simulatedError,
  });

  // 5. Persist canonical PaymentAttempt record
  const attempt = await PaymentAttempt.create(
    {
      id: randomUUID(),
      businessType,
      businessReference: trimmedRef,
      accountType,
      accountRef,
      provider: 'cutluy',
      providerPaymentId: providerResult.providerPaymentId,
      amount: formattedAmount,
      currency: 'USD',
      status: providerResult.status,
      providerStatus: providerResult.providerStatus,
      idempotencyKey: trimmedKey,
      checkoutUrl: providerResult.checkoutUrl,
      rawResponse: providerResult.rawResponse,
      version: 1,
    },
    { transaction: parentTx }
  );

  return { duplicate: false, attempt };
}

async function getPaymentAttempt(idOrReference, { transaction: tx } = {}) {
  if (!idOrReference) return null;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(idOrReference).trim());

  if (isUuid) {
    const byPk = await PaymentAttempt.findByPk(idOrReference.trim(), { transaction: tx });
    if (byPk) return byPk;
  }

  return PaymentAttempt.findOne({
    where: { businessReference: String(idOrReference).trim() },
    transaction: tx,
  });
}

module.exports = {
  createPaymentAttempt,
  getPaymentAttempt,
};
