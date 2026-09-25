// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, test } from 'vitest';
import { Hero } from '../components/Hero';

afterEach(cleanup);

const identity = (overrides = {}) => ({
  name: 'Aura Botanicals',
  heroHeadline: 'Nature, thoughtfully bottled',
  heroSubtitle: 'Gentle formulas for every day.',
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
    const { container } = renderHero(identity(), { eyebrow: 'Pure botanical skincare', note: 'In harmony with nature' });
    expect(screen.getByRole('heading', { level: 1, name: 'Nature, thoughtfully bottled' })).toBeTruthy();
    expect(screen.getByText('Gentle formulas for every day.')).toBeTruthy();
    expect(screen.getByText('Pure botanical skincare')).toBeTruthy();
    expect(screen.getByText('In harmony with nature')).toBeTruthy();
    expect([...container.querySelectorAll('img')].map((img) => img.getAttribute('src'))).toEqual([
      'https://cdn.example.com/1.jpg',
      'https://cdn.example.com/2.jpg',
    ]);
  });

  test('falls back to the store name and default button text', () => {
    renderHero(identity({ heroHeadline: '', heroSubtitle: '' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Aura Botanicals' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Shop now' }).getAttribute('href')).toBe('/products');
    expect(screen.queryByRole('link', { name: 'Our story' })).toBeNull();
  });

  test('uses the merchant button text and links to the story when there is one', () => {
    renderHero(identity(), { buttonText: 'Browse the collection', storyLink: true });
    expect(screen.getByRole('link', { name: 'Browse the collection' }).getAttribute('href')).toBe('/products');
    expect(screen.getByRole('link', { name: 'Our story' }).getAttribute('href')).toBe('/#our-story');
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
