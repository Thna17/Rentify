// @vitest-environment jsdom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { emptyCheckoutDetails } from '@rentify/storefront/checkout';
import { CheckoutForm } from '../components/CheckoutForm';

afterEach(cleanup);

function Harness({ onSubmit, initial = emptyCheckoutDetails(), submitError }) {
  const [details, setDetails] = useState(initial);
  const [method, setMethod] = useState('COD');
  return (
    <CheckoutForm
      details={details}
      paymentMethod={method}
      onDetailsChange={setDetails}
      onPaymentMethodChange={setMethod}
      onSubmit={() => onSubmit(details, method)}
      submitting={false}
      submitError={submitError}
    />
  );
}

const type = (label, value) => fireEvent.change(screen.getByLabelText(label, { exact: false }), { target: { value } });

describe('CheckoutForm', () => {
  test('blocks submission and explains missing required fields', () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Place order' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Please check the highlighted fields.')).toBeTruthy();
    expect(screen.getAllByText('This field is required.')).toHaveLength(4);
    expect(screen.getByLabelText('Full name', { exact: false }).getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(screen.getByLabelText('Full name', { exact: false }));
  });

  test('rejects an invalid phone number', () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    type('Full name', 'Sok Dara');
    type('Phone number', '123');
    fireEvent.change(screen.getByLabelText('Province / City', { exact: false }), { target: { value: 'Siem Reap' } });
    type('Street address', 'Wat Bo road');
    fireEvent.click(screen.getByRole('button', { name: 'Place order' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Enter a valid Cambodian phone number.')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText('Phone number', { exact: false }));
  });

  test('submits valid details with the chosen payment method', () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    type('Full name', 'Sok Dara');
    type('Phone number', '012 345 678');
    fireEvent.change(screen.getByLabelText('Province / City', { exact: false }), { target: { value: 'Phnom Penh' } });
    type('Street address', '#12, St 271');
    fireEvent.click(screen.getByRole('radio', { name: /KHQR/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Place order' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Sok Dara', phone: '012 345 678', province: 'Phnom Penh', street: '#12, St 271' }),
      'KHQR'
    );
  });

  test('shows order submission errors', () => {
    render(<Harness onSubmit={vi.fn()} submitError="We couldn’t place your order. Your cart has not been changed." />);
    expect(screen.getByRole('alert').textContent).toContain('Your cart has not been changed');
  });
});
