// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, test, expect } from 'vitest';
import { ProductCard } from './ProductCard';

const { trackStorefrontEvent } = vi.hoisted(() => ({ trackStorefrontEvent: vi.fn() }));
vi.mock('@rentify/storefront', () => ({
  trackStorefrontEvent,
  useStorefrontWebsite: () => ({ websiteId: 'website-test' }),
  useAuth: () => ({ isOwner: false }),
  DASHBOARD_URL: 'http://localhost:4400',
}));
vi.mock('@rentify/storefront/api', () => ({
  useDeleteProductMutation: () => [vi.fn().mockResolvedValue({}), { isLoading: false }],
}));

test('adds an available product to the cart and emits a safe analytics event', async () => {
  const addToCart = vi.fn().mockResolvedValue(undefined);
  render(<MemoryRouter><ProductCard product={{ id: 'product-1', name: 'Kampot Pepper', price: 12, stockQuantity: 4, trackInventory: true, images: [] }} onAddToCart={addToCart} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: /add kampot pepper to cart/i }));
  expect(addToCart).toHaveBeenCalledOnce();
  await waitFor(() => expect(trackStorefrontEvent).toHaveBeenCalledWith({ name: 'add_to_cart', websiteId: 'website-test', productId: 'product-1', quantity: 1 }));
  expect(await screen.findByText('Added')).toBeTruthy();
});

test('does not offer add to cart for unavailable stock', () => {
  render(<MemoryRouter><ProductCard product={{ id: 'product-2', name: 'Sold out item', price: 3, stockQuantity: 0, trackInventory: true, images: [] }} onAddToCart={vi.fn()} /></MemoryRouter>);
  expect(screen.getByRole('button', { name: /add sold out item to cart/i }).disabled).toBe(true);
});
