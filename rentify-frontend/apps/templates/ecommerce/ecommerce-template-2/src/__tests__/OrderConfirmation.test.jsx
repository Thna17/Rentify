// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { buildReceiptSnapshot } from '../receipt';

const api = vi.hoisted(() => ({
  receipt: vi.fn(),
  paymentStatus: vi.fn(),
}));

vi.mock('@rentify/storefront/api', () => ({
  useGetMyOrderDetailsQuery: (...args) => api.receipt(...args),
  useCheckStorefrontPaymentStatusQuery: (...args) => api.paymentStatus(...args),
}));
vi.mock('@rentify/storefront/website', () => ({
  useStorefrontWebsite: () => ({ identity: { name: 'Aura Botanicals', logoUrl: null } }),
}));

const { default: OrderConfirmation } = await import('../pages/OrderConfirmation');

const creationResponse = {
  order: { id: 'order-1', orderNumber: 'ORD-1001', status: 'pending', totalAmount: 52.9, currency: 'USD', subtotal: 48, taxTotal: 3.84, shippingFee: 1.06 },
  payment: {
    id: 'pay-1',
    amount: '52.90',
    status: 'pending',
    paymentMethod: 'KHQR',
    transactionData: {
      md5Hash: 'abc123',
      rawQR: '00020101021229180014khqr@test',
      qrCodeUrl: 'https://bakong.example/deeplink/xyz',
      merchantAccount: 'merchant@bank',
      merchantName: 'Aura Botanicals Co',
    },
  },
  orderItems: [{ id: 'item-1', productId: 'p1', quantity: 2, price: '24.00' }],
};
const cartLines = [{ id: 'line-1', productId: 'p1', quantity: 2, Product: { name: 'Gentle Foaming Cleanser', images: [] } }];
const details = { name: 'Sok Dara', phone: '012345678', province: 'Phnom Penh', street: '#12, St 271' };

const renderPage = (state) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/confirmation/order-1', state }]}>
      <Routes>
        <Route path="/confirmation/:orderId" element={<OrderConfirmation />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  api.paymentStatus.mockReturnValue({ data: { status: 'pending' }, isFetching: false, refetch: vi.fn() });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('receipt snapshot', () => {
  test('keeps only browser-safe payment fields', () => {
    const snapshot = buildReceiptSnapshot(creationResponse, cartLines, details);
    expect(snapshot.payment).toEqual({
      id: 'pay-1',
      amount: '52.90',
      status: 'pending',
      paymentMethod: 'KHQR',
      qrCodeUrl: 'https://bakong.example/deeplink/xyz',
      rawQR: '00020101021229180014khqr@test',
    });
    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain('merchant@bank');
    expect(serialized).not.toContain('Aura Botanicals Co');
    expect(serialized).not.toContain('abc123');
    expect(snapshot.OrderItems[0].Product.name).toBe('Gentle Foaming Cleanser');
  });

  test('returns null without a created order', () => {
    expect(buildReceiptSnapshot({ error: 'Cart is empty' })).toBeNull();
  });
});

describe('order confirmation', () => {
  const receipt = buildReceiptSnapshot(creationResponse, cartLines, details);

  test('shows the KHQR payment step from the placed-order snapshot when the receipt endpoint fails', () => {
    api.receipt.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: { status: 500 }, refetch: vi.fn() });
    const { container } = renderPage({ placed: true, receipt, totals: creationResponse.order });

    expect(screen.getByRole('heading', { name: 'Thank you — your order is placed' })).toBeTruthy();
    expect(screen.getByText('ORD-1001')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Pay with KHQR' })).toBeTruthy();
    expect(container.querySelector('svg title')?.textContent).toBe('KHQR payment code for $52.90');
    expect(screen.getByRole('link', { name: 'Open in Bakong app' }).getAttribute('href')).toBe('https://bakong.example/deeplink/xyz');
    expect(screen.getByText('Awaiting payment')).toBeTruthy();
    expect(screen.getByText('$3.84')).toBeTruthy(); // tax from the creation response
    expect(container.textContent).not.toContain('merchant@bank');
  });

  test('switches to the paid state once the payment status settles', async () => {
    api.receipt.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: { status: 500 }, refetch: vi.fn() });
    api.paymentStatus.mockReturnValue({ data: { status: 'paid' }, isFetching: false, refetch: vi.fn() });
    renderPage({ placed: true, receipt });

    await waitFor(() => expect(screen.getByText('Paid')).toBeTruthy());
    expect(screen.queryByRole('heading', { name: 'Pay with KHQR' })).toBeNull();
    expect(screen.getByText('Payment received. The store will prepare your order and contact you about delivery.')).toBeTruthy();
  });

  test('explains when an order cannot be viewed from this browser', () => {
    api.receipt.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: { status: 404 }, refetch: vi.fn() });
    renderPage(undefined);
    expect(screen.getByRole('heading', { name: 'Order not found' })).toBeTruthy();
  });

  test('uses the receipt endpoint when it works, with cash-on-delivery next steps', () => {
    api.receipt.mockReturnValue({
      data: { ...receipt, payment: { ...receipt.payment, paymentMethod: 'COD' } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    renderPage(undefined);
    expect(screen.getByText(/The store will contact you on 012345678/)).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Pay with KHQR' })).toBeNull();
  });
});
