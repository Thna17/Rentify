// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { CartPill } from '../components/CartPill';
import { ShopContact } from '../components/ShopContact';
import { MenuRow } from '../components/MenuList';
import { VisitSection } from '../components/VisitSection';
import { parseOpeningHours } from '../storeContent';

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

describe('MenuRow', () => {
  const drink = (overrides = {}) => ({
    id: 'latte-1',
    name: 'Iced Latte',
    price: '2.75',
    description: 'Double shot over cold milk.\nServed with ice.',
    stockQuantity: 5,
    trackInventory: true,
    images: [{ url: 'https://cdn.example.com/latte.jpg' }],
    ...overrides,
  });

  test('shows the name, price and first line of the description, and links to the item', () => {
    at('/', <MenuRow product={drink()} onAdd={vi.fn()} />);
    expect(screen.getByRole('link', { name: 'Iced Latte' }).getAttribute('href')).toBe('/product/latte-1');
    expect(screen.getByText('$2.75')).toBeTruthy();
    expect(screen.getByText('Double shot over cold milk.')).toBeTruthy();
    expect(screen.queryByText(/Served with ice/)).toBeNull();
  });

  test('adds the drink straight from the menu', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    const item = drink();
    at('/', <MenuRow product={item} onAdd={onAdd} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Iced Latte to cart' }));
    expect(onAdd).toHaveBeenCalledWith(item);
    await waitFor(() => expect(screen.getByText('Added')).toBeTruthy());
  });

  test('sends shoppers to the item when a size must be chosen first', () => {
    at('/', <MenuRow product={drink({ ProductVariants: [{ id: 'v1', status: 'active', stockQuantity: 3 }] })} onAdd={vi.fn()} />);
    expect(screen.getByRole('link', { name: 'Select options: Iced Latte' }).getAttribute('href')).toBe('/product/latte-1');
    expect(screen.queryByRole('button', { name: 'Add Iced Latte to cart' })).toBeNull();
  });
});

describe('VisitSection', () => {
  const visit = (overrides = {}) => ({ title: '', hours: [], mapUrl: null, ...overrides });

  test('shows the hours, address, phone and directions the merchant provided', () => {
    at(
      '/',
      <VisitSection
        visit={visit({ hours: parseOpeningHours('Mon–Fri | 7:00–18:00\nSun | Closed'), mapUrl: 'https://maps.app.goo.gl/abc' })}
        identity={identity({ location: 'St. 240, Phnom Penh', phone: '012 345 678' })}
      />
    );
    expect(screen.getByRole('heading', { name: 'Visit us' })).toBeTruthy();
    expect(screen.getByText('St. 240, Phnom Penh')).toBeTruthy();
    expect(screen.getByRole('link', { name: '012 345 678' }).getAttribute('href')).toBe('tel:012345678');
    expect(screen.getByText('7:00–18:00')).toBeTruthy();
    expect(screen.getByText('Closed')).toBeTruthy();
    const directions = screen.getByRole('link', { name: 'Get directions' });
    expect(directions.getAttribute('href')).toBe('https://maps.app.goo.gl/abc');
    expect(directions.getAttribute('rel')).toBe('noopener noreferrer');
  });

  test('leaves out what the merchant has not provided', () => {
    at('/', <VisitSection visit={visit({ title: 'Come say hi' })} identity={identity({ location: 'Siem Reap' })} />);
    expect(screen.getByRole('heading', { name: 'Come say hi' })).toBeTruthy();
    expect(screen.queryByText('Opening hours')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Get directions' })).toBeNull();
    expect(screen.queryByText(/Open now|Closed now/)).toBeNull();
  });
});
