'use strict';

// rentify-server/src/modules/billing/cutluyAdapter.js
// P3-PAY-002: Provider Adapter Port & CutLuy Implementation.
// Implements provider-neutral payment boundary with synthetic contract fixtures,
// strict USD enforcement, account separation, and error classification.

const { createHash, randomBytes } = require('node:crypto');
const axios = require('axios');
const { getCutluyConfig } = require('../../config/cutluyConfig');
const { CUTLUY_ERROR_CODES, CutLuyError, mapProviderStatus } = require('./cutluyErrors');

const ALLOWED_METADATA_KEYS = Object.freeze([
  'userId',
  'packageId',
  'subscriptionId',
  'orderId',
  'storeId',
  'websiteId',
  'environment',
]);

class CutLuyAdapter {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * Sanitizes metadata to allowlisted keys only.
   * Strips all secrets, personal data, card numbers, or full addresses.
   */
  sanitizeMetadata(metadata = {}) {
    if (!metadata || typeof metadata !== 'object') return {};
    const sanitized = {};
    for (const key of Object.keys(metadata)) {
      if (ALLOWED_METADATA_KEYS.includes(key)) {
        sanitized[key] = metadata[key];
      }
    }
    return sanitized;
  }

  /**
   * Validates account reference and ownership.
   */
  validateAccountScope({ accountRef, accountType = 'subscription' }) {
    if (!accountRef || typeof accountRef !== 'string' || !accountRef.trim()) {
      throw new CutLuyError(
        CUTLUY_ERROR_CODES.ACCOUNT_MISMATCH,
        'accountRef is required and must be a valid internal identifier',
        400
      );
    }

    const normType = String(accountType).trim().toLowerCase();
    if (!['subscription', 'seller'].includes(normType)) {
      throw new CutLuyError(
        CUTLUY_ERROR_CODES.ACCOUNT_MISMATCH,
        `Invalid accountType: "${accountType}". Must be "subscription" or "seller"`,
        400
      );
    }

    const config = getCutluyConfig();
    if (normType === 'subscription') {
      const expectedRef = config.subscriptionAccountRef || 'rentify_corp_sub_ref';
      if (accountRef.trim() !== expectedRef) {
        throw new CutLuyError(
          CUTLUY_ERROR_CODES.ACCOUNT_MISMATCH,
          `Subscription accountRef mismatch: expected "${expectedRef}", received "${accountRef}"`,
          403
        );
      }
    }

    return { accountRef: accountRef.trim(), accountType: normType };
  }

  /**
   * Validates currency and amount.
   * Only USD is accepted. KHR is strictly rejected without conversion.
   */
  validateCurrencyAndAmount(amount, currency) {
    const normCurrency = String(currency || '').trim().toUpperCase();
    if (normCurrency === 'KHR') {
      throw new CutLuyError(
        CUTLUY_ERROR_CODES.KHR_CURRENCY_NOT_SUPPORTED,
        'CutLuy operates with USD only. KHR currency conversion is not supported.',
        400,
        { currency: 'KHR' }
      );
    }
    if (normCurrency !== 'USD') {
      throw new CutLuyError(
        CUTLUY_ERROR_CODES.UNSUPPORTED_CURRENCY,
        `Unsupported currency: "${currency}". CutLuy supports USD only.`,
        400,
        { currency }
      );
    }

    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      throw new CutLuyError(
        CUTLUY_ERROR_CODES.INVALID_AMOUNT,
        `Amount must be a positive number in USD: ${amount}`,
        400,
        { amount }
      );
    }

    return {
      amount: numAmount.toFixed(2),
      currency: 'USD',
    };
  }

  /**
   * Classifies provider errors into operational taxonomy.
   */
  classifyError(error) {
    if (!error) return 'UNKNOWN_ERROR';
    const status = error.statusCode || error.status || (error.response && error.response.status);

    if (status === 402) return CUTLUY_ERROR_CODES.QUOTA_EXHAUSTED;
    if (status === 429) return CUTLUY_ERROR_CODES.RATE_LIMITED;
    if (status >= 500 && status <= 599) return CUTLUY_ERROR_CODES.PROVIDER_OUTAGE;
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      return CUTLUY_ERROR_CODES.PROVIDER_OUTAGE;
    }
    if (status >= 400 && status <= 499) return CUTLUY_ERROR_CODES.CLIENT_ERROR;
    return error.code || 'UNKNOWN_ERROR';
  }

  /**
   * Creates a payment attempt at the provider.
   * Uses high-fidelity synthetic contract fixtures when live endpoints are not used.
   */
  async createPayment({
    accountRef,
    accountType = 'subscription',
    amount,
    currency = 'USD',
    referenceId,
    idempotencyKey,
    returnUrl,
    cancelUrl,
    metadata = {},
    simulatedError = null,
  }) {
    // 1. Account scope validation
    const accountScope = this.validateAccountScope({ accountRef, accountType });

    // 2. Currency and amount validation (USD only; KHR rejected)
    const money = this.validateCurrencyAndAmount(amount, currency);

    // 3. Business reference & idempotency validation
    if (!referenceId || typeof referenceId !== 'string' || !referenceId.trim()) {
      throw new CutLuyError(CUTLUY_ERROR_CODES.CLIENT_ERROR, 'referenceId is required', 400);
    }
    if (!idempotencyKey || typeof idempotencyKey !== 'string' || !idempotencyKey.trim()) {
      throw new CutLuyError(CUTLUY_ERROR_CODES.CLIENT_ERROR, 'idempotencyKey is required', 400);
    }

    // 4. Simulated failure conditions for tests
    if (simulatedError) {
      if (simulatedError === 'QUOTA_EXHAUSTED' || simulatedError === 402) {
        throw new CutLuyError(
          CUTLUY_ERROR_CODES.QUOTA_EXHAUSTED,
          'CutLuy account monthly transaction quota exhausted (402 Payment Required)',
          402
        );
      }
      if (simulatedError === 'RATE_LIMITED' || simulatedError === 429) {
        throw new CutLuyError(
          CUTLUY_ERROR_CODES.RATE_LIMITED,
          'CutLuy API rate limit exceeded (429 Too Many Requests)',
          429
        );
      }
      if (simulatedError === 'PROVIDER_OUTAGE' || simulatedError === 503) {
        throw new CutLuyError(
          CUTLUY_ERROR_CODES.PROVIDER_OUTAGE,
          'CutLuy upstream payment gateway unavailable (503 Service Unavailable)',
          503
        );
      }
      throw new CutLuyError(CUTLUY_ERROR_CODES.CLIENT_ERROR, String(simulatedError), 400);
    }

    // 5. Sanitized metadata (NO secrets, NO QR payloads)
    const sanitizedMetadata = this.sanitizeMetadata(metadata);

    // 6. Live API execution if configured and not in synthetic/test mode
    const config = getCutluyConfig();
    if (!config.isSynthetic && config.apiKey) {
      try {
        const payload = {
          amount: parseFloat(money.amount),
          currency: 'USD',
          reference_id: referenceId.trim(),
        };
        if (returnUrl) payload.return_url = returnUrl;
        if (cancelUrl) payload.cancel_url = cancelUrl;
        if (Object.keys(sanitizedMetadata).length > 0) {
          payload.metadata = sanitizedMetadata;
        }

        const res = await axios.post(`${config.apiBaseUrl}/v1/payments`, payload, {
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Rentify/1.0 (axios)',
          },
          timeout: 15000,
        });

        const liveData = res.data || {};
        const providerPaymentId = String(liveData.id || `cutluy_pay_${Date.now()}`);
        const checkoutUrl = liveData.checkout_url || `https://cutluy.com/pay/${providerPaymentId}`;
        const qrString = liveData.qr_string || null;

        return {
          providerPaymentId,
          checkoutUrl,
          qrString,
          status: mapProviderStatus(liveData.status || 'pending'),
          providerStatus: liveData.status || 'pending',
          amount: money.amount,
          currency: 'USD',
          referenceId: referenceId.trim(),
          rawResponse: liveData,
        };
      } catch (err) {
        const classified = this.classifyError(err);
        const errMsg = err.response?.data?.message || err.response?.data?.error || err.message;
        throw new CutLuyError(
          classified,
          `CutLuy API payment creation failed: ${errMsg}`,
          err.response?.status || 500,
          { originalError: errMsg }
        );
      }
    }

    // 7. Generate synthetic contract fixture (fallback / test mode)
    // Note: internal accountRef is NOT sent to CutLuy
    const hash = createHash('sha256').update(`${referenceId}-${idempotencyKey}`).digest('hex').slice(0, 16);
    const providerPaymentId = `cutluy_pay_${hash}`;
    const checkoutUrl = `https://checkout.cutluy.com/pay/${providerPaymentId}`;

    const syntheticFixture = {
      id: providerPaymentId,
      status: 'pending',
      amount: money.amount,
      currency: 'USD',
      reference_id: referenceId.trim(),
      checkout_url: checkoutUrl,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      metadata: sanitizedMetadata,
    };

    return {
      providerPaymentId,
      checkoutUrl,
      status: mapProviderStatus(syntheticFixture.status),
      providerStatus: syntheticFixture.status,
      amount: money.amount,
      currency: 'USD',
      referenceId: referenceId.trim(),
      rawResponse: syntheticFixture,
    };
  }

  /**
   * Retrieves payment status from provider for reconciliation.
   */
  async getPayment({
    accountRef,
    accountType = 'subscription',
    providerPaymentId,
    fixtureState = null,
    simulatedError = null,
  }) {
    this.validateAccountScope({ accountRef, accountType });

    if (!providerPaymentId || typeof providerPaymentId !== 'string') {
      throw new CutLuyError(CUTLUY_ERROR_CODES.CLIENT_ERROR, 'providerPaymentId is required', 400);
    }

    if (simulatedError) {
      if (simulatedError === 'PROVIDER_OUTAGE' || simulatedError === 503) {
        throw new CutLuyError(CUTLUY_ERROR_CODES.PROVIDER_OUTAGE, 'CutLuy service outage during reconciliation', 503);
      }
      throw new CutLuyError(CUTLUY_ERROR_CODES.CLIENT_ERROR, String(simulatedError), 400);
    }

    // If a fixture state is provided for testing, return it
    if (fixtureState) {
      return {
        providerPaymentId,
        status: mapProviderStatus(fixtureState.status),
        providerStatus: fixtureState.status,
        amount: fixtureState.amount ? Number(fixtureState.amount).toFixed(2) : '0.00',
        currency: fixtureState.currency || 'USD',
        referenceId: fixtureState.reference_id || fixtureState.referenceId,
        accountRef,
        rawResponse: fixtureState,
      };
    }

    // Live API query if configured and not synthetic
    const config = getCutluyConfig();
    if (!config.isSynthetic && config.apiKey) {
      try {
        const res = await axios.get(`${config.apiBaseUrl}/v1/payments/${encodeURIComponent(providerPaymentId)}`, {
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'User-Agent': 'Rentify/1.0 (axios)',
          },
          timeout: 10000,
        });
        const liveData = res.data || {};
        return {
          providerPaymentId,
          status: mapProviderStatus(liveData.status || 'pending'),
          providerStatus: liveData.status || 'pending',
          amount: liveData.amount ? Number(liveData.amount).toFixed(2) : '0.00',
          currency: liveData.currency || 'USD',
          referenceId: liveData.reference_id || liveData.referenceId,
          accountRef,
          rawResponse: liveData,
        };
      } catch (err) {
        const classified = this.classifyError(err);
        throw new CutLuyError(
          classified,
          `CutLuy getPayment failed: ${err.message}`,
          err.response?.status || 500
        );
      }
    }

    // Default synthetic response
    return {
      providerPaymentId,
      status: 'pending',
      providerStatus: 'pending',
      amount: '50.00',
      currency: 'USD',
      referenceId: 'ref-default',
      accountRef,
      rawResponse: { id: providerPaymentId, status: 'pending' },
    };
  }

  mapProviderStatus(status) {
    return mapProviderStatus(status);
  }
}

const cutluyAdapter = new CutLuyAdapter();

module.exports = {
  CutLuyAdapter,
  cutluyAdapter,
  ALLOWED_METADATA_KEYS,
};
