// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const refetch = vi.fn();
const refetchCategories = vi.fn();
vi.mock('@rentify/storefront/website', () => ({
  useStorefrontCategories: () => ({ categories: [{ id: 'cat-1', name: 'Serums' }], refetch: refetchCategories }),
  useStorefrontWebsite: () => ({
    websiteId: 'website-1',
    refetch,
    content: [
      { label: 'Hero Headline', value: { text: 'Old headline' } },
      { label: 'Story Title', value: '' },
    ],
  }),
}));

const { StorefrontOwnerProvider, OwnerAddButton, OwnerEditButton, OwnerSectionPlaceholder } = await import('@rentify/storefront/owner/StorefrontOwner');
const { Provider } = await import('react-redux');
const { MemoryRouter } = await import('react-router-dom');
const { configureStore } = await import('@reduxjs/toolkit');
const { productApi } = await import('@rentify/apis/apis/productApi');

const fields = [
  { category: 'Hero', label: 'Hero Headline', type: 'text' },
  { category: 'Our Story', label: 'Story Title', type: 'text' },
];

const makeStore = () =>
  configureStore({ reducer: { [productApi.reducerPath]: productApi.reducer }, middleware: (d) => d().concat(productApi.middleware) });

const renderStore = () =>
  render(
    <Provider store={makeStore()}>
      <MemoryRouter>
        <StorefrontOwnerProvider fields={fields}>
          <OwnerEditButton section="Hero" />
          <OwnerSectionPlaceholder section="Our Story" />
          <OwnerAddButton kind="product" categoryId="cat-1" />
          <OwnerAddButton kind="category" />
        </StorefrontOwnerProvider>
      </MemoryRouter>
    </Provider>
  );

const reply = (status, body) => Promise.resolve({ ok: status < 300, status, json: () => Promise.resolve(body) });

beforeEach(() => {
  refetch.mockReset();
  document.documentElement.lang = 'en';
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('storefront owner tools', () => {
  test('shoppers see nothing and never load the editor', async () => {
    const fetchMock = vi.fn(() => reply(401, { error: 'Unauthorized' }));
    vi.stubGlobal('fetch', fetchMock);
    renderStore();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/websites\/website-1\/owner-access$/);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: 'include' });
    expect(screen.queryByRole('button', { name: /edit/i })).toBeNull();
    expect(screen.queryByText('Edit store')).toBeNull();
  });

  test('the owner edits a section and saves only what changed', async () => {
    const fetchMock = vi.fn((url, options = {}) => {
      if (String(url).endsWith('/owner-access')) return reply(200, { owner: true });
      if (options.method === 'PUT') return reply(200, { success: true });
      return reply(404, {});
    });
    vi.stubGlobal('fetch', fetchMock);
    renderStore();

    // Empty sections invite the owner to fill them in.
    expect(await screen.findByRole('button', { name: /Add our story/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Hero' }));
    const headline = await screen.findByLabelText('Hero Headline');
    expect(headline.value).toBe('Old headline');

    fireEvent.change(headline, { target: { value: 'New headline' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(screen.getByText('Saved. Your store is updated.')).toBeTruthy(), { timeout: 5000 });
    const put = fetchMock.mock.calls.find(([, options]) => options?.method === 'PUT');
    expect(put[0]).toMatch(/\/api\/websites\/website-1\/storefront-content$/);
    expect(JSON.parse(put[1].body)).toEqual({ fields: { 'Hero Headline': 'New headline' } });
    expect(refetch).toHaveBeenCalled();
  });

  test('field errors from Core are shown next to the field', async () => {
    vi.stubGlobal('fetch', vi.fn((url, options = {}) => {
      if (String(url).endsWith('/owner-access')) return reply(200, { owner: true });
      if (options.method === 'PUT') return reply(400, { fields: [{ label: 'Hero Headline', message: 'Must be 120 characters or fewer' }] });
      return reply(404, {});
    }));
    renderStore();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Hero' }));
    fireEvent.change(await screen.findByLabelText('Hero Headline'), { target: { value: 'x'.repeat(130) } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Must be 120 characters or fewer', {}, { timeout: 5000 })).toBeTruthy();
    expect(screen.getByLabelText('Hero Headline').getAttribute('aria-invalid')).toBe('true');
  });

  test('a skincare store adds a product with the fields its store type requires', async () => {
    const fetchMock = vi.fn((url, options = {}) => {
      const target = String(url);
      if (target.endsWith('/owner-access')) return reply(200, { owner: true });
      if (target.endsWith('/manage/config')) {
        return reply(200, {
          niche: 'skincare',
          quickAddFields: [
            { key: 'skinType', target: 'nicheAttributes', type: 'list', label: 'Skin types', required: true },
            { key: 'ingredients', target: 'nicheAttributes', type: 'list', label: 'Ingredients', required: true },
          ],
        });
      }
      if (options.method === 'POST') return reply(201, { id: 'product-9' });
      return reply(404, {});
    });
    vi.stubGlobal('fetch', fetchMock);
    renderStore();

    // Both the page button and the owner bar offer it; use the page button.
    fireEvent.click((await screen.findAllByRole('button', { name: /Add product/ }))[0]);
    fireEvent.change(await screen.findByLabelText('Name *', {}, { timeout: 5000 }), { target: { value: 'Rose Toner' } });
    fireEvent.change(screen.getByLabelText('Price (USD) *'), { target: { value: '18.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add product' }));
    // Required store-type fields are checked before anything is sent.
    expect(await screen.findAllByText('Required', {}, { timeout: 5000 })).toHaveLength(2);
    expect(fetchMock.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false);

    fireEvent.change(screen.getByLabelText('Skin types *'), { target: { value: 'Dry, Sensitive' } });
    fireEvent.change(screen.getByLabelText('Ingredients *'), { target: { value: 'Rose water' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add product' }));

    expect(await screen.findByText('Added to your store.', {}, { timeout: 5000 })).toBeTruthy();
    const [url, options] = fetchMock.mock.calls.find(([, call]) => call?.method === 'POST');
    expect(url).toMatch(/\/api\/product\/website-1$/);
    expect(JSON.parse(options.body)).toMatchObject({
      name: 'Rose Toner',
      price: 18.5,
      stockQuantity: 10,
      categoryId: 'cat-1',
      status: 'active',
      nicheAttributes: { skinType: ['Dry', 'Sensitive'], ingredients: ['Rose water'] },
    });
    expect(screen.getByRole('link', { name: 'View product' }).getAttribute('href')).toBe('/product/product-9');
  });

  test('the owner adds a category', async () => {
    const fetchMock = vi.fn((url, options = {}) => {
      if (String(url).endsWith('/owner-access')) return reply(200, { owner: true });
      if (options.method === 'POST') return reply(201, { id: 'cat-2', name: 'Masks' });
      return reply(404, {});
    });
    vi.stubGlobal('fetch', fetchMock);
    renderStore();
    fireEvent.click((await screen.findAllByRole('button', { name: /Add category/ }))[0]);
    fireEvent.change(await screen.findByLabelText('Name *', {}, { timeout: 5000 }), { target: { value: '  Masks ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add category' }));
    expect(await screen.findByText('Added to your store.', {}, { timeout: 5000 })).toBeTruthy();
    const [url, options] = fetchMock.mock.calls.find(([, call]) => call?.method === 'POST');
    expect(url).toMatch(/\/api\/categories\/website-1$/);
    expect(JSON.parse(options.body)).toEqual({ name: 'Masks' });
    expect(refetchCategories).toHaveBeenCalled();
  });
});
