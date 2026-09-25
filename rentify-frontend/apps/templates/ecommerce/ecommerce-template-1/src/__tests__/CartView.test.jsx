// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { getCartTotals } from '@rentify/storefront/commerce';
import { CartView } from '../components/CartView';

afterEach(cleanup);

const lines = [
  {
    id: 'line-1',
    productId: 'p1',
    quantity: 2,
    unitPrice: '12.50',
    selectedOptions: { Size: 'M' },
    Product: { id: 'p1', name: 'Silk scarf', price: '12.50', trackInventory: true, stockQuantity: 5, images: [] },
  },
  {
    id: 'line-2',
    productId: 'p2',
    quantity: 1,
    unitPrice: '3.25',
    selectedOptions: {},
    Product: { id: 'p2', name: 'Palm sugar', price: '3.25', trackInventory: false, images: [] },
  },
];

const renderCart = (props = {}) =>
  render(
    <MemoryRouter>
      <CartView lines={lines} totals={getCartTotals(lines)} onQuantityChange={vi.fn()} onRemove={vi.fn()} {...props} />
    </MemoryRouter>
  );

describe('CartView', () => {
  test('shows line totals, item count and subtotal', () => {
    renderCart();
    expect(screen.getByText('$25.00')).toBeTruthy();
    expect(screen.getByText('$12.50 each')).toBeTruthy();
    expect(screen.getByText('Size: M')).toBeTruthy();
    expect(screen.getByTestId('cart-subtotal').textContent).toBe('$28.25');
    expect(screen.getByText('(3 items)')).toBeTruthy();
  });

  test('does not invent delivery fees or tax', () => {
    renderCart();
    expect(screen.queryByText(/shipping:/i)).toBeNull();
    expect(screen.getByText('Delivery fees and tax are calculated by the store when you place your order.')).toBeTruthy();
  });

  test('updates quantity and removes items', () => {
    const onQuantityChange = vi.fn();
    const onRemove = vi.fn();
    renderCart({ onQuantityChange, onRemove });
    const first = screen.getAllByRole('listitem')[0];
    fireEvent.click(within(first).getByRole('button', { name: 'Increase quantity' }));
    expect(onQuantityChange).toHaveBeenCalledWith(lines[0], 3);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Palm sugar from cart' }));
    expect(onRemove).toHaveBeenCalledWith(lines[1]);
  });

  test('disables a line while it is being updated', () => {
    renderCart({ busyLineId: 'line-1' });
    expect(screen.getByRole('button', { name: 'Remove Silk scarf from cart' }).disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Remove Palm sugar from cart' }).disabled).toBe(false);
  });

  test('shows the empty state with a way back to the shop', () => {
    renderCart({ lines: [], totals: getCartTotals([]) });
    expect(screen.getByRole('heading', { name: 'Your cart is empty' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Continue shopping' }).getAttribute('href')).toBe('/products');
    expect(screen.queryByRole('link', { name: 'Go to checkout' })).toBeNull();
  });
});
