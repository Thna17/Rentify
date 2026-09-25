// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { ProductPurchasePanel } from '../components/ProductPurchasePanel';

afterEach(cleanup);

const simple = (overrides = {}) => ({
  id: 'p1',
  name: 'Palm sugar',
  price: '4.00',
  status: 'active',
  trackInventory: true,
  stockQuantity: 3,
  lowStockThreshold: 0,
  ProductVariants: [],
  ProductOptions: [],
  ...overrides,
});

const withVariants = () =>
  simple({
    name: 'Krama scarf',
    price: '8.00',
    ProductOptions: [
      { id: 'o1', name: 'Color', type: 'color', position: 0, values: [{ value: 'Red', hexCode: '#b91c1c' }, { value: 'Blue', hexCode: '#1d4ed8' }] },
    ],
    ProductVariants: [
      { id: 'v-red', status: 'active', price: '9.00', trackInventory: true, stockQuantity: 0, optionValues: { Color: 'Red' } },
      { id: 'v-blue', status: 'active', price: '8.50', trackInventory: true, stockQuantity: 5, optionValues: { Color: 'Blue' } },
    ],
  });

const quantityInput = () => screen.getByLabelText('Quantity');

describe('quantity validation', () => {
  test('cannot increase past available stock and explains why', () => {
    render(<ProductPurchasePanel product={simple()} onAdd={vi.fn()} />);
    const increase = screen.getByRole('button', { name: 'Increase quantity' });
    fireEvent.click(increase);
    fireEvent.click(increase);
    expect(quantityInput().value).toBe('3');
    fireEvent.click(increase);
    expect(quantityInput().value).toBe('3');
    expect(screen.getByText('You can order up to 3 of this item.')).toBeTruthy();
  });

  test('clamps typed quantities to the allowed range', () => {
    render(<ProductPurchasePanel product={simple()} onAdd={vi.fn()} />);
    fireEvent.change(quantityInput(), { target: { value: '50' } });
    fireEvent.blur(quantityInput());
    expect(quantityInput().value).toBe('3');
    fireEvent.change(quantityInput(), { target: { value: '0' } });
    fireEvent.blur(quantityInput());
    expect(quantityInput().value).toBe('1');
  });

  test('cannot decrease below one', () => {
    render(<ProductPurchasePanel product={simple()} onAdd={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Decrease quantity' }).disabled).toBe(true);
  });
});

describe('add to cart', () => {
  test('adds the chosen quantity', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    const product = simple();
    render(<ProductPurchasePanel product={product} onAdd={onAdd} />);
    fireEvent.click(screen.getByRole('button', { name: 'Increase quantity' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));
    expect(onAdd).toHaveBeenCalledWith({ product, variantId: undefined, quantity: 2, selectedOptions: {} });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Added' })).toBeTruthy());
  });

  test('shows the API error and keeps the form usable', async () => {
    const onAdd = vi.fn().mockRejectedValue({ data: { error: 'Insufficient stock' } });
    render(<ProductPurchasePanel product={simple()} onAdd={onAdd} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Insufficient stock');
    expect(screen.getByRole('button', { name: 'Add to cart' }).disabled).toBe(false);
  });

  test('prevents out-of-stock purchases', () => {
    const onAdd = vi.fn();
    render(<ProductPurchasePanel product={simple({ stockQuantity: 0 })} onAdd={onAdd} />);
    const button = screen.getByRole('button', { name: 'Out of stock' });
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(onAdd).not.toHaveBeenCalled();
  });
});

describe('variants', () => {
  test('starts on the first purchasable variant with its price', () => {
    render(<ProductPurchasePanel product={withVariants()} onAdd={vi.fn()} />);
    expect(screen.getByRole('radio', { name: 'Color: Blue' }).checked).toBe(true);
    expect(screen.getByText('$8.50')).toBeTruthy();
  });

  test('marks and blocks sold-out variants', () => {
    render(<ProductPurchasePanel product={withVariants()} onAdd={vi.fn()} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Color: Red (Out of stock)' }));
    expect(screen.getByText('$9.00')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Out of stock' }).disabled).toBe(true);
  });

  test('sends the selected variant and options to the cart', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(<ProductPurchasePanel product={withVariants()} onAdd={onAdd} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ variantId: 'v-blue', quantity: 1, selectedOptions: { Color: 'Blue' } }));
  });
});
