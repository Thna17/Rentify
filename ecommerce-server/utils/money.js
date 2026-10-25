// ecommerce-server/utils/money.js
// Canonical Money representation and exact arithmetic for the Rentify platform.
// Eliminates floating-point drift (IEEE 754) by operating strictly on integer minor units (cents).

class CurrencyMismatchError extends Error {
  constructor(c1, c2) {
    super(`Currency mismatch: cannot perform operation between "${c1}" and "${c2}"`);
    this.name = 'CurrencyMismatchError';
    this.statusCode = 400;
    this.code = 'CURRENCY_MISMATCH';
  }
}

class InvalidMoneyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidMoneyError';
    this.statusCode = 400;
    this.code = 'INVALID_MONEY';
  }
}

class UnsupportedCurrencyError extends Error {
  constructor(message, code = 'UNSUPPORTED_CURRENCY') {
    super(message);
    this.name = 'UnsupportedCurrencyError';
    this.statusCode = 400;
    this.code = code;
  }
}

/**
 * Currency metadata and minor unit scales.
 * USD: 2 decimal places (1 USD = 100 cents).
 * KHR: Cambodian Riel. In Release 1, online checkout is USD only; KHR is disabled.
 */
const CURRENCY_CONFIG = Object.freeze({
  USD: { scale: 2, symbol: '$', name: 'US Dollar', onlineCheckoutAllowed: true },
  KHR: { scale: 0, symbol: '៛', name: 'Cambodian Riel', onlineCheckoutAllowed: false },
});

/**
 * Parse an input amount into integer minor units without floating-point math.
 * Accepts decimal strings ("15.50", "15.5", "15"), finite numbers (15.5), or integer minor units.
 * Rejects negative values (unless allowNegative=true), non-finite, NaN, scientific notation,
 * or strings with more decimal places than allowed by the currency scale.
 */
function parseMinor(value, currency = 'USD', { allowNegative = false, maxMinor = 100_000_000_00 } = {}) {
  const normCurrency = String(currency || 'USD').trim().toUpperCase();
  const config = CURRENCY_CONFIG[normCurrency] || { scale: 2 };
  const scale = config.scale;

  if (value === null || value === undefined || value === '') {
    throw new InvalidMoneyError('Monetary amount is required');
  }

  // If already an integer in minor units (e.g. from an internal call)
  if (typeof value === 'object' && value !== null && typeof value.amountMinor === 'number') {
    if (value.currency && value.currency.toUpperCase() !== normCurrency) {
      throw new CurrencyMismatchError(value.currency, normCurrency);
    }
    return value.amountMinor;
  }

  const str = String(value).trim();

  // Guard against scientific notation or malformed strings
  if (/e/i.test(str)) {
    throw new InvalidMoneyError(`Invalid monetary amount format "${str}": scientific notation prohibited`);
  }

  const match = str.match(/^(-)?(\d+)(?:\.(\d+))?$/);
  if (!match) {
    throw new InvalidMoneyError(`Invalid monetary amount format "${str}"`);
  }

  const isNeg = Boolean(match[1]);
  if (isNeg && !allowNegative) {
    throw new InvalidMoneyError(`Negative monetary amounts are prohibited: "${str}"`);
  }

  const wholeStr = match[2];
  const fracStr = match[3] || '';

  if (fracStr.length > scale) {
    throw new InvalidMoneyError(`Amount "${str}" exceeds maximum allowed scale (${scale}) for ${normCurrency}`);
  }

  const whole = Number.parseInt(wholeStr, 10);
  const frac = Number.parseInt(fracStr.padEnd(scale, '0'), 10) || 0;

  if (!Number.isSafeInteger(whole)) {
    throw new InvalidMoneyError(`Monetary amount exceeds safe integer limit`);
  }

  const multiplier = 10 ** scale;
  const minor = whole * multiplier + frac;
  const result = isNeg ? -minor : minor;

  if (!Number.isSafeInteger(result)) {
    throw new InvalidMoneyError(`Monetary amount exceeds safe integer limit`);
  }

  if (Math.abs(result) > maxMinor) {
    throw new InvalidMoneyError(`Monetary amount exceeds maximum allowed ceiling`);
  }

  return result;
}

/**
 * Format integer minor units into an exact fixed decimal string.
 * Example: 1550 minor units in USD -> "15.50"
 */
function formatDecimal(minor, currency = 'USD') {
  if (!Number.isSafeInteger(minor)) {
    throw new InvalidMoneyError(`Invalid minor units for formatting: ${minor}`);
  }

  const normCurrency = String(currency || 'USD').trim().toUpperCase();
  const config = CURRENCY_CONFIG[normCurrency] || { scale: 2 };
  const scale = config.scale;

  if (scale === 0) {
    return String(minor);
  }

  const isNeg = minor < 0;
  const abs = Math.abs(minor);
  const multiplier = 10 ** scale;
  const whole = Math.floor(abs / multiplier);
  const frac = String(abs % multiplier).padStart(scale, '0');

  return `${isNeg ? '-' : ''}${whole}.${frac}`;
}

/**
 * Canonical Money Value Object.
 * Immutable, exact, non-floating-point.
 */
class Money {
  constructor(amountMinor, currency = 'USD') {
    if (!Number.isSafeInteger(amountMinor)) {
      throw new InvalidMoneyError(`amountMinor must be a safe integer, received ${amountMinor}`);
    }
    const normCurrency = String(currency || 'USD').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(normCurrency)) {
      throw new UnsupportedCurrencyError(`Invalid currency code "${currency}"`);
    }

    this.amountMinor = amountMinor;
    this.currency = normCurrency;
    Object.freeze(this);
  }

  get amount() {
    return formatDecimal(this.amountMinor, this.currency);
  }

  static fromDecimal(amount, currency = 'USD', options = {}) {
    const minor = parseMinor(amount, currency, options);
    return new Money(minor, currency);
  }

  static fromMinor(minor, currency = 'USD') {
    if (!Number.isSafeInteger(minor)) {
      throw new InvalidMoneyError(`Minor units must be a safe integer`);
    }
    return new Money(minor, currency);
  }

  static zero(currency = 'USD') {
    return new Money(0, currency);
  }

  add(other) {
    const o = other instanceof Money ? other : Money.fromDecimal(other, this.currency);
    if (this.currency !== o.currency) {
      throw new CurrencyMismatchError(this.currency, o.currency);
    }
    return new Money(this.amountMinor + o.amountMinor, this.currency);
  }

  subtract(other) {
    const o = other instanceof Money ? other : Money.fromDecimal(other, this.currency);
    if (this.currency !== o.currency) {
      throw new CurrencyMismatchError(this.currency, o.currency);
    }
    return new Money(this.amountMinor - o.amountMinor, this.currency);
  }

  multiply(factor) {
    if (typeof factor !== 'number' || !Number.isFinite(factor)) {
      throw new InvalidMoneyError(`Multiplication factor must be a finite number: ${factor}`);
    }
    // Deterministic half-up rounding on minor units
    const product = Math.round(this.amountMinor * factor);
    if (!Number.isSafeInteger(product)) {
      throw new InvalidMoneyError(`Product exceeds safe integer limit`);
    }
    return new Money(product, this.currency);
  }

  equals(other) {
    if (!(other instanceof Money)) return false;
    return this.amountMinor === other.amountMinor && this.currency === other.currency;
  }

  isZero() {
    return this.amountMinor === 0;
  }

  isPositive() {
    return this.amountMinor > 0;
  }

  isNegative() {
    return this.amountMinor < 0;
  }

  toString() {
    return this.amount;
  }

  toJSON() {
    return {
      amount: this.amount,
      amountMinor: this.amountMinor,
      currency: this.currency,
    };
  }
}

/**
 * Enforce Release 1 Online Checkout policy:
 * - Online checkout is COD and USD only.
 * - KHR checkout is disabled in Release 1.
 * - Silent conversion is strictly prohibited.
 */
function assertSupportedOnlineCurrency(currency) {
  const norm = String(currency || '').trim().toUpperCase();
  if (norm === 'KHR') {
    const err = new UnsupportedCurrencyError(
      'KHR online checkout is disabled in Release 1. Online checkout is USD only.',
      'KHR_CHECKOUT_DISABLED'
    );
    err.statusCode = 400;
    err.status = 400;
    throw err;
  }
  if (norm !== 'USD') {
    const err = new UnsupportedCurrencyError(
      `Unsupported currency for online checkout: "${currency}". Only USD is accepted in Release 1.`,
      'UNSUPPORTED_CURRENCY'
    );
    err.statusCode = 400;
    err.status = 400;
    throw err;
  }
  return 'USD';
}

/**
 * Prevents silent conversion between USD and KHR.
 */
function assertNoSilentConversion(currencyA, currencyB) {
  const cA = String(currencyA || '').trim().toUpperCase();
  const cB = String(currencyB || '').trim().toUpperCase();
  if (cA && cB && cA !== cB) {
    throw new CurrencyMismatchError(cA, cB);
  }
}

module.exports = {
  Money,
  parseMinor,
  formatDecimal,
  assertSupportedOnlineCurrency,
  assertNoSilentConversion,
  CurrencyMismatchError,
  InvalidMoneyError,
  UnsupportedCurrencyError,
  CURRENCY_CONFIG,
};
