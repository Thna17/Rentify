// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { emptyCheckoutDetails } from '@rentify/storefront/checkout';
import { CheckoutForm } from '../components/CheckoutForm';
import { PaymentMethods } from '../components/PaymentMethods';

afterEach(cleanup);

const renderCheckout = (paymentMethods) =>
  render(
    <CheckoutForm
      details={emptyCheckoutDetails()}
      paymentMethod="COD"
      paymentMethods={paymentMethods}
      onDetailsChange={vi.fn()}
      onPaymentMethodChange={vi.fn()}
      onSubmit={vi.fn()}
    />
  );

describe('payment methods', () => {
  test('the footer shows cash on delivery as available and online methods as coming soon', () => {
    render(<PaymentMethods />);
    expect(screen.getByText('Cash on delivery')).toBeTruthy();
    expect(screen.getAllByText('Coming soon')).toHaveLength(3);
    expect(screen.getByText('Bakong KHQR')).toBeTruthy();
  });

  test('checkout lists online methods it does not offer as disabled, never as choices', () => {
    renderCheckout(['COD']);
    expect(screen.getAllByRole('radio')).toHaveLength(1);
    const upcoming = screen.getByRole('list', { name: 'Not available yet' });
    expect(within(upcoming).getAllByRole('listitem').map((item) => item.getAttribute('aria-disabled'))).toEqual(['true', 'true', 'true']);
    expect(within(upcoming).getByText('Bakong KHQR')).toBeTruthy();
  });

  test('a store that already takes KHQR does not show it as coming soon', () => {
    renderCheckout(['COD', 'KHQR']);
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    const upcoming = screen.getByRole('list', { name: 'Not available yet' });
    expect(within(upcoming).queryByText('Bakong KHQR')).toBeNull();
  });
});
