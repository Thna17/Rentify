// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { ProductCard, getProductBadge } from '../components/ProductCard';

afterEach(cleanup);

const product = (overrides = {}) => ({
  id: 'product-1',
  name: 'Kampot Pepper',
  price: '12.50',
  compareAtPrice: null,
  status: 'active',
  trackInventory: true,
  stockQuantity: 10,
  lowStockThreshold: 3,
  images: [{ url: 'https://cdn.example.com/pepper.jpg' }],
  Category: { id: 'cat-1', name: 'Spices' },
  ProductVariants: [],
  ...overrides,
});

const renderCard = (props) => render(<MemoryRouter><ProductCard onAdd={vi.fn()} {...props} /></MemoryRouter>);

describe('ProductCard', () => {
  test('shows image, name, category, price and links to the product', () => {
    const { container } = renderCard({ product: product() });
    expect(screen.getByRole('heading', { name: 'Kampot Pepper' })).toBeTruthy();
    expect(screen.getByText('Spices')).toBeTruthy();
    expect(screen.getByText('$12.50')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Kampot Pepper' }).getAttribute('href')).toBe('/product/product-1');
    expect(container.querySelector('img').getAttribute('src')).toBe('https://cdn.example.com/pepper.jpg');
  });

  test('shows a compare-at price only when it is higher than the price', () => {
    renderCard({ product: product({ compareAtPrice: '15.00' }) });
    expect(screen.getByText('$15.00').tagName).toBe('S');
    cleanup();
    renderCard({ product: product({ compareAtPrice: '10.00' }) });
    expect(screen.queryByText('$10.00')).toBeNull();
  });

  test('adds an available product and confirms it', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    const item = product();
    renderCard({ product: item, onAdd });
    fireEvent.click(screen.getByRole('button', { name: 'Add Kampot Pepper to cart' }));
    expect(onAdd).toHaveBeenCalledWith(item);
    await waitFor(() => expect(screen.getByText('Added')).toBeTruthy());
  });

  test('resets the button when adding fails', async () => {
    const onAdd = vi.fn().mockRejectedValue(new Error('network'));
    renderCard({ product: product(), onAdd });
    fireEvent.click(screen.getByRole('button', { name: 'Add Kampot Pepper to cart' }));
    await waitFor(() => expect(screen.getByText('Add to bag')).toBeTruthy());
  });

  test('blocks add to cart when tracked stock is empty', () => {
    const onAdd = vi.fn();
    renderCard({ product: product({ stockQuantity: 0 }), onAdd });
    const button = screen.getByRole('button', { name: 'Add Kampot Pepper to cart' });
    expect(button.disabled).toBe(true);
    expect(screen.getAllByText('Out of stock').length).toBeGreaterThan(0);
    fireEvent.click(button);
    expect(onAdd).not.toHaveBeenCalled();
  });

  test('shows low stock only from real stock data', () => {
    renderCard({ product: product({ stockQuantity: 2 }) });
    expect(screen.getByText('Only 2 left')).toBeTruthy();
    cleanup();
    renderCard({ product: product({ trackInventory: false }) });
    expect(screen.queryByText(/left/)).toBeNull();
  });

  test('sends shoppers to the product page when options must be chosen', () => {
    renderCard({
      product: product({ ProductVariants: [{ id: 'v1', status: 'active', trackInventory: true, stockQuantity: 3, optionValues: { Size: 'M' } }] }),
    });
    expect(screen.queryByRole('button', { name: /to cart/ })).toBeNull();
    expect(screen.getByRole('link', { name: 'Select options: Kampot Pepper' }).getAttribute('href')).toBe('/product/product-1');
  });
});

describe('getProductBadge', () => {
  const now = Date.parse('2026-09-25T00:00:00Z');

  test('shows the real discount when the compare-at price is higher', () => {
    expect(getProductBadge(product({ price: '28.00', compareAtPrice: '35.00' }), now)).toEqual({ kind: 'sale', percent: 20 });
    expect(getProductBadge(product({ price: '28.00', compareAtPrice: '20.00' }), now)).toBeNull();
  });

  test('marks products added in the last 30 days as new, and nothing otherwise', () => {
    expect(getProductBadge(product({ createdAt: '2026-09-10T00:00:00Z' }), now)).toEqual({ kind: 'new' });
    expect(getProductBadge(product({ createdAt: '2026-07-01T00:00:00Z' }), now)).toBeNull();
    expect(getProductBadge(product({ createdAt: 'not a date' }), now)).toBeNull();
    expect(getProductBadge(product(), now)).toBeNull();
  });

  test('renders the badge on the card', () => {
    renderCard({ product: product({ price: '28.00', compareAtPrice: '35.00' }) });
    expect(screen.getByText('-20%')).toBeTruthy();
  });
});
