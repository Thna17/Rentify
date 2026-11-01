// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import Home from '../../../templates/ecommerce/ecommerce-template-5/src/home';

const state = vi.hoisted(() => ({ language: 'en', result: {}, identity: {}, categories: [] }));
vi.mock('@rentify/storefront/api', () => ({ useGetAllProductsQuery: () => state.result }));
vi.mock('@rentify/storefront/website', () => ({
  useStorefrontWebsite: () => ({ websiteId: 'store-website', identity: state.identity }),
  useStorefrontCategories: () => ({ categories: state.categories }),
}));
vi.mock('@rentify/storefront/analytics', () => ({ trackStorefrontEvent: vi.fn() }));
vi.mock('@rentify/storefront/owner/StorefrontOwner', () => ({
  OwnerAddButton: () => null, OwnerEditButton: () => null,
}));
vi.mock('../../../templates/ecommerce/ecommerce-template-1/src/i18n', () => ({
  useI18n: () => ({ language: state.language, t: (key) => key }),
}));
vi.mock('../../../templates/ecommerce/ecommerce-template-1/src/hooks/useDocumentTitle', () => ({ useDocumentTitle: vi.fn() }));
vi.mock('../../../templates/ecommerce/ecommerce-template-1/src/components/ProductGrid', () => ({
  ProductGrid: ({ products }) => <div>{products.map((product) => <span key={product.id}>{product.name}</span>)}</div>,
  ProductGridSkeleton: () => <div role="status">loading</div>,
}));

describe('Editorial Minimal storefront', () => {
  beforeEach(() => { state.language = 'en'; state.identity = { name: 'Lotus', heroImages: [] }; state.categories = [];
    state.result = { isSuccess: true, data: { products: [] } }; });
  afterEach(cleanup);
  test('uses merchant identity and real catalog links', () => {
    state.categories = [{ id: 'cat-1', name: 'Crafts' }];
    state.result = { isSuccess: true, data: { products: [{ id: 'p1', name: 'Handmade vase' }] } };
    render(<MemoryRouter><Home /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Lotus' })).toBeTruthy();
    expect(screen.getByText('Handmade vase')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Crafts/ }).getAttribute('href')).toContain('cat-1');
  });
  test('shows loading, empty and Khmer content', () => {
    state.language = 'kh'; state.result = { isLoading: true };
    const view = render(<MemoryRouter><Home /></MemoryRouter>);
    expect(screen.getByRole('status').textContent).toBe('loading');
    expect(screen.getByText('ផ្ទះ និងការរស់នៅ')).toBeTruthy();
    state.result = { isSuccess: true, data: { products: [] } }; view.rerender(<MemoryRouter><Home /></MemoryRouter>);
    expect(screen.getByText('home.emptyTitle')).toBeTruthy();
  });
});
