// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, test } from 'vitest';
import { Hero } from '../components/Hero';

afterEach(cleanup);

const identity = (overrides = {}) => ({
  name: 'Aura Botanicals',
  heroHeadline: 'Glow naturally',
  heroSubtitle: 'Pure botanicals',
  heroImages: ['https://cdn.example.com/1.jpg', 'https://cdn.example.com/2.jpg'],
  ...overrides,
});

const renderHero = (value) => render(<MemoryRouter><Hero identity={value} /></MemoryRouter>);

describe('Hero banner', () => {
  test('shows the merchant images only, without overlay text', () => {
    const { container } = renderHero(identity());
    expect([...container.querySelectorAll('img')].map((img) => img.getAttribute('src'))).toEqual([
      'https://cdn.example.com/1.jpg',
      'https://cdn.example.com/2.jpg',
    ]);
    expect(screen.queryByText('Glow naturally')).toBeNull();
    expect(screen.queryByText('Pure botanicals')).toBeNull();
    expect(screen.getByRole('region', { name: 'Glow naturally' })).toBeTruthy();
  });

  test('slides link to the shop and can be navigated', () => {
    renderHero(identity());
    expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(['/products', '/products']);
    expect(screen.getByRole('button', { name: 'Go to slide 2' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next slide' })).toBeTruthy();
  });

  test('hides the slide controls for a single image and renders nothing without images', () => {
    renderHero(identity({ heroImages: ['https://cdn.example.com/1.jpg'] }));
    expect(screen.queryByRole('button')).toBeNull();
    cleanup();
    const { container } = renderHero(identity({ heroImages: [] }));
    expect(container.innerHTML).toBe('');
  });
});
