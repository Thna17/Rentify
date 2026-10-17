// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { Hero } from '../components/Hero';
import { parseOpeningHours } from '../storeContent';

afterEach(cleanup);

const identity = (overrides = {}) => ({
  name: 'Mekong Brew',
  heroHeadline: 'Slow coffee, fast mornings',
  heroSubtitle: 'Khmer beans, roasted in small batches.',
  heroImages: ['https://cdn.example.com/1.jpg', 'https://cdn.example.com/2.jpg'],
  ...overrides,
});

const renderHero = (value, props = {}) =>
  render(
    <MemoryRouter>
      <Hero identity={value} {...props} />
    </MemoryRouter>
  );

describe('Hero', () => {
  test('shows the merchant headline, subtitle, eyebrow, note and photos', () => {
    const { container } = renderHero(identity(), { eyebrow: 'Specialty coffee', note: 'Freshly brewed' });
    expect(screen.getByRole('heading', { level: 1, name: 'Slow coffee, fast mornings' })).toBeTruthy();
    expect(screen.getByText('Khmer beans, roasted in small batches.')).toBeTruthy();
    expect(screen.getByText('Specialty coffee')).toBeTruthy();
    expect(screen.getByText('Freshly brewed')).toBeTruthy();
    expect([...container.querySelectorAll('img')].map((img) => img.getAttribute('src'))).toEqual([
      'https://cdn.example.com/1.jpg',
      'https://cdn.example.com/2.jpg',
    ]);
  });

  test('falls back to the store name and default actions', () => {
    renderHero(identity({ heroHeadline: '', heroSubtitle: '' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Mekong Brew' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Order now' }).getAttribute('href')).toBe('/products');
    expect(screen.getByRole('link', { name: 'See the menu' }).getAttribute('href')).toBe('/#menu');
    // No hours: no open/closed badge and no link to them.
    expect(screen.queryByText(/Open now|Closed now/)).toBeNull();
    expect(screen.queryByRole('link', { name: 'Opening hours and address' })).toBeNull();
  });

  test('uses the merchant button text and shows whether the café is open', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 28, 9, 0));
    try {
      renderHero(identity(), { buttonText: 'Order a coffee', hours: parseOpeningHours('Daily | 7:00–18:00') });
      expect(screen.getByRole('link', { name: 'Order a coffee' }).getAttribute('href')).toBe('/products');
      expect(screen.getByText('Open now')).toBeTruthy();
      expect(screen.getByRole('link', { name: 'Opening hours and address' }).getAttribute('href')).toBe('/#visit');
    } finally {
      vi.useRealTimers();
    }
  });

  test('lets shoppers pick a photo when there are several, and shows artwork without photos', () => {
    const { container } = renderHero(identity());
    fireEvent.click(screen.getByRole('button', { name: 'Go to slide 2' }));
    expect(screen.getByRole('button', { name: 'Go to slide 2' }).getAttribute('aria-current')).toBe('true');
    cleanup();
    renderHero(identity({ heroImages: ['https://cdn.example.com/1.jpg'] }));
    expect(screen.queryByRole('button')).toBeNull();
    cleanup();
    const empty = renderHero(identity({ heroImages: [] }));
    expect(empty.container.querySelector('img')).toBeNull();
    expect(empty.container.querySelector('svg')).toBeTruthy();
    expect(container).toBeTruthy();
  });
});
