/**
 * Storefront checkout contract.
 *
 * Mirrors what `POST /api/order/websites/:websiteId/orders` accepts: a
 * `shippingDetails` object stored as the order's ShippingDetail (name and
 * phone are required columns) plus a payment method. Email is optional; when
 * present the API links or creates a customer record for the store.
 */

/** Payment methods the storefront API can actually process for online orders. */
export const STOREFRONT_PAYMENT_METHODS = ['COD', 'KHQR'] as const;
export type StorefrontPaymentMethod = (typeof STOREFRONT_PAYMENT_METHODS)[number];

export interface CheckoutDetails {
  name: string;
  phone: string;
  email: string;
  province: string;
  district: string;
  commune: string;
  street: string;
  note: string;
}

export type CheckoutField = keyof CheckoutDetails | 'paymentMethod';
/** Error codes rather than copy, so templates can localize the messages. */
export type CheckoutErrorCode = 'required' | 'invalid_phone' | 'invalid_email' | 'too_long' | 'invalid_method';
export type CheckoutErrors = Partial<Record<CheckoutField, CheckoutErrorCode>>;

export const emptyCheckoutDetails = (): CheckoutDetails => ({
  name: '',
  phone: '',
  email: '',
  province: '',
  district: '',
  commune: '',
  street: '',
  note: '',
});

const FIELD_LIMITS: Record<keyof CheckoutDetails, number> = {
  name: 120,
  phone: 20,
  email: 160,
  province: 80,
  district: 120,
  commune: 120,
  street: 255,
  note: 255,
};

/**
 * Normalizes a Cambodian mobile number to the local `0XXXXXXXX` form.
 * Accepts spaces, dashes, dots and a +855 / 855 prefix. Returns null if the
 * number is not 8–9 digits after the leading zero.
 */
export const normalizeCambodianPhone = (value: string): string | null => {
  const compact = String(value || '').replace(/[\s\-.()]/g, '');
  const local = compact.replace(/^\+?855/, '0');
  const withZero = local.startsWith('0') ? local : `0${local}`;
  return /^0\d{8,9}$/.test(withZero) ? withZero : null;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const validateCheckout = (
  details: CheckoutDetails,
  paymentMethod: string
): CheckoutErrors => {
  const errors: CheckoutErrors = {};
  const value = (field: keyof CheckoutDetails) => String(details[field] ?? '').trim();

  for (const field of Object.keys(FIELD_LIMITS) as (keyof CheckoutDetails)[]) {
    if (value(field).length > FIELD_LIMITS[field]) errors[field] = 'too_long';
  }

  if (!value('name')) errors.name = 'required';
  if (!value('phone')) errors.phone = 'required';
  else if (!normalizeCambodianPhone(value('phone'))) errors.phone = 'invalid_phone';
  if (value('email') && !EMAIL.test(value('email'))) errors.email = 'invalid_email';
  if (!value('province')) errors.province = 'required';
  if (!value('street')) errors.street = 'required';
  if (!STOREFRONT_PAYMENT_METHODS.includes(paymentMethod as StorefrontPaymentMethod)) {
    errors.paymentMethod = 'invalid_method';
  }
  return errors;
};

/** Request body for the order endpoint, trimmed and without empty optional fields. */
export const buildOrderRequest = (
  websiteId: string,
  details: CheckoutDetails,
  paymentMethod: StorefrontPaymentMethod
) => {
  const shippingDetails: Record<string, string> = {};
  for (const [field, raw] of Object.entries(details)) {
    const trimmed = String(raw ?? '').trim();
    if (trimmed) shippingDetails[field] = trimmed;
  }
  shippingDetails.phone = normalizeCambodianPhone(details.phone) || shippingDetails.phone;
  return { websiteId, paymentMethod, currency: 'USD', shippingDetails };
};

/** Cambodian provinces and the capital, as accepted in `shippingDetails.province`. */
export const CAMBODIA_PROVINCES = [
  'Phnom Penh',
  'Banteay Meanchey',
  'Battambang',
  'Kampong Cham',
  'Kampong Chhnang',
  'Kampong Speu',
  'Kampong Thom',
  'Kampot',
  'Kandal',
  'Kep',
  'Koh Kong',
  'Kratie',
  'Mondulkiri',
  'Oddar Meanchey',
  'Pailin',
  'Preah Sihanouk',
  'Preah Vihear',
  'Prey Veng',
  'Pursat',
  'Ratanakiri',
  'Siem Reap',
  'Stung Treng',
  'Svay Rieng',
  'Takeo',
  'Tboung Khmum',
] as const;
