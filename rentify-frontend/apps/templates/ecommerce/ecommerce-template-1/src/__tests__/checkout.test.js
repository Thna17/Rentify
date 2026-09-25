import { describe, expect, test } from 'vitest';
import {
  buildOrderRequest,
  emptyCheckoutDetails,
  normalizeCambodianPhone,
  validateCheckout,
} from '@rentify/storefront/checkout';

const valid = {
  ...emptyCheckoutDetails(),
  name: 'Sok Dara',
  phone: '012 345 678',
  province: 'Phnom Penh',
  street: '#12, St 271',
};

describe('checkout validation', () => {
  test('requires name, phone, province and street', () => {
    expect(validateCheckout(emptyCheckoutDetails(), 'COD')).toEqual({
      name: 'required',
      phone: 'required',
      province: 'required',
      street: 'required',
    });
  });

  test('accepts a complete Cambodian delivery address', () => {
    expect(validateCheckout(valid, 'COD')).toEqual({});
    expect(validateCheckout(valid, 'KHQR')).toEqual({});
  });

  test('rejects invalid phone, email and unsupported payment methods', () => {
    expect(validateCheckout({ ...valid, phone: '12345' }, 'COD')).toEqual({ phone: 'invalid_phone' });
    expect(validateCheckout({ ...valid, email: 'dara@' }, 'COD')).toEqual({ email: 'invalid_email' });
    expect(validateCheckout(valid, 'card')).toEqual({ paymentMethod: 'invalid_method' });
  });

  test('rejects values longer than the API columns', () => {
    expect(validateCheckout({ ...valid, street: 'x'.repeat(256) }, 'COD')).toEqual({ street: 'too_long' });
  });
});

describe('phone numbers', () => {
  test.each([
    ['012345678', '012345678'],
    ['012 345 678', '012345678'],
    ['+855 12 345 678', '012345678'],
    ['855969876543', '0969876543'],
    ['096-987-6543', '0969876543'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeCambodianPhone(input)).toBe(expected);
  });

  test.each(['', '1234', '01234567890', 'phone'])('rejects %s', (input) => {
    expect(normalizeCambodianPhone(input)).toBeNull();
  });
});

test('builds the order request without empty optional fields', () => {
  expect(buildOrderRequest('website-1', { ...valid, note: '  ' }, 'KHQR')).toEqual({
    websiteId: 'website-1',
    paymentMethod: 'KHQR',
    currency: 'USD',
    shippingDetails: { name: 'Sok Dara', phone: '012345678', province: 'Phnom Penh', street: '#12, St 271' },
  });
});
