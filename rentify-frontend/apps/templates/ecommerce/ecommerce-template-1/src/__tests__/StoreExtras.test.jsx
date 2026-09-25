// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { CartPill } from '../components/CartPill';
import { ShopContact } from '../components/ShopContact';
import { CategoryShowcase } from '../components/CategoryShowcase';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const at = (path, ui) => render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);
const identity = (overrides = {}) => ({ name: 'Aura', phone: '', socialLinks: [], ...overrides });

describe('CartPill', () => {
  test('shows the item count and subtotal and links to the cart', () => {
    at('/', <CartPill totals={{ itemCount: 3, subtotal: 28.25 }} />);
    const link = screen.getByRole('link', { name: 'View cart: 3 items, $28.25' });
    expect(link.getAttribute('href')).toBe('/cart');
  });

  test('uses the singular for one item', () => {
    at('/', <CartPill totals={{ itemCount: 1, subtotal: 4 }} />);
    expect(screen.getByRole('link', { name: 'View cart: 1 item, $4.00' })).toBeTruthy();
  });

  test.each([
    ['an empty cart', '/', 0],
    ['the cart page', '/cart', 2],
    ['checkout', '/checkout', 2],
    ['an order confirmation', '/confirmation/abc', 2],
  ])('is hidden on %s', (_, path, itemCount) => {
    at(path, <CartPill totals={{ itemCount, subtotal: 10 }} />);
    expect(screen.queryByRole('link')).toBeNull();
  });
});

describe('ShopContact', () => {
  test('offers only the contact channels the merchant published', () => {
    render(
      <ShopContact
        productName="Silk scarf"
        identity={identity({ phone: '012 345 678', socialLinks: [{ network: 'telegram', url: 'https://t.me/aura' }] })}
      />
    );
    expect(screen.getByRole('link', { name: 'Chat on Telegram' }).getAttribute('href')).toBe('https://t.me/aura');
    expect(screen.getByRole('link', { name: 'Call 012 345 678' }).getAttribute('href')).toBe('tel:012345678');
    expect(screen.queryByRole('link', { name: 'Message on Facebook' })).toBeNull();
  });

  test('shows only the share action when there is no contact information', () => {
    render(<ShopContact productName="Silk scarf" identity={identity()} />);
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.getByRole('button', { name: 'Share' })).toBeTruthy();
  });

  test('copies the product link when the share sheet is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<ShopContact productName="Silk scarf" identity={identity()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Link copied' })).toBeTruthy());
    expect(writeText).toHaveBeenCalledWith(window.location.href);
  });
});

describe('CategoryShowcase', () => {
  test('links each arched tile to its category and ignores unsafe image URLs', () => {
    const { container } = at(
      '/',
      <CategoryShowcase
        categories={[
          { id: 'c1', name: 'Serums', image: 'https://cdn.example.com/serum.jpg' },
          { id: 'c2', name: 'Soaps', image: 'javascript:alert(1)' },
        ]}
      />
    );
    expect(screen.getByRole('link', { name: 'Serums' }).getAttribute('href')).toBe('/products?category=c1');
    expect(screen.getByRole('link', { name: 'Soaps' })).toBeTruthy();
    expect([...container.querySelectorAll('img')].map((img) => img.getAttribute('src'))).toEqual(['https://cdn.example.com/serum.jpg']);
  });
});
