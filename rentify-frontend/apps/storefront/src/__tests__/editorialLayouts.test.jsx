// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { INDUSTRY_HOMES } from '../../../templates/ecommerce/ecommerce-template-5/src/compositions';
import { EditorialStyleContext } from '../../../templates/ecommerce/ecommerce-template-5/src/styleContext';
import { EDITORIAL_STYLES } from '@rentify/storefront/editorialStyles';
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

describe('six distinct customizable storefront layouts', () => {
  beforeEach(() => {
    state.language = 'en';
    state.identity = { name: 'My merchant', heroHeadline: 'My own collection', heroSubtitle: 'My own description', heroImages: ['https://example.com/my-banner.jpg'] };
    state.categories = [{ id: 'real-category', name: 'Merchant category' }];
    state.result = { data: { products: [{ id: 'product-a', name: 'Merchant product' }] } };
  });
  afterEach(cleanup);
  test.each([[5, 'home-slider'], [6, 'tech-departments'], [7, 'beauty-split'], [8, 'grocery-catalog'], [9, 'fashion-campaign'], [10, 'crafts-journal']])('template %s has its own composition and keeps merchant content', (id, composition) => {
    const Page = INDUSTRY_HOMES[id] || Home;
    const { container } = render(<MemoryRouter><EditorialStyleContext.Provider value={EDITORIAL_STYLES[id]}><Page /></EditorialStyleContext.Provider></MemoryRouter>);
    expect(container.querySelector(`[data-template-layout="${composition}"]`)).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('My own collection');
    expect(container.querySelector('img').getAttribute('src')).toBe('https://example.com/my-banner.jpg');
    expect(screen.getByText('Merchant product')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Merchant category/ }).getAttribute('href')).toContain('real-category');
    if (id === 6 || id === 8) expect(container.querySelector('aside #collections')).toBeTruthy();
    if (id === 7) expect(container.querySelector('.hero-beauty > .distinct-hero-media + .distinct-hero-copy')).toBeTruthy();
    if (id === 9) expect(container.querySelector('.products-fashion')).toBeTruthy();
    if (id === 10) expect(container.querySelector('.crafts-catalog #collections')).toBeTruthy();
  });
  test.each([6, 7, 8, 9, 10])('template %s preserves error recovery', (id) => {
    state.result = { isError: true, refetch: vi.fn() };
    const Page = INDUSTRY_HOMES[id];
    render(<MemoryRouter><EditorialStyleContext.Provider value={EDITORIAL_STYLES[id]}><Page /></EditorialStyleContext.Provider></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'error.retry' })).toBeTruthy();
  });
});
