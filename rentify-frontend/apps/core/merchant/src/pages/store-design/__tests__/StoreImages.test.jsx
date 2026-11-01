// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { StoreImages } from '../components/StoreImages';
const api = vi.hoisted(() => ({ upload: vi.fn(), unwrap: vi.fn() }));
vi.mock('@rentify/apis/apis/websiteApi', () => ({ useUploadImageMutation: () => [api.upload, { isLoading: false }] }));
beforeEach(() => { api.upload.mockReset(); api.unwrap.mockReset(); api.upload.mockReturnValue({ unwrap: api.unwrap }); });
afterEach(cleanup);
test.each([['logo', { isLogo: true }], ['banner', { type: 'cover' }]])('saves merchant %s with the existing ownership-scoped upload API', async (kind, options) => {
  api.unwrap.mockResolvedValue({ url: 'https://example.com/upload.webp' }); const saved = vi.fn();
  render(<StoreImages websiteId="my-website" content={[]} onSaved={saved} t={(key) => key} />);
  const file = new File(['image'], 'brand.webp', { type: 'image/webp' });
  fireEvent.change(screen.getByLabelText(`merchant.storeDesign.images.${kind}`), { target: { files: [file] } });
  expect(api.upload).toHaveBeenCalledWith({ websiteId: 'my-website', file, ...options });
  await waitFor(() => expect(saved).toHaveBeenCalledOnce());
  expect(screen.getByRole('status').textContent).toBe('merchant.storeDesign.images.saved');
});
test('failed upload leaves the existing merchant image and reports recovery', async () => {
  api.unwrap.mockRejectedValue(new Error('upload rejected')); const saved=vi.fn();
  render(<StoreImages websiteId="my-website" content={[{ label: 'Logo', value: 'https://example.com/existing.webp' }]} onSaved={saved} t={(key) => key} />);
  fireEvent.change(screen.getByLabelText('merchant.storeDesign.images.logo'), { target: { files: [new File(['image'], 'logo.webp', { type:'image/webp' })] } });
  await waitFor(() => expect(screen.getByRole('status').textContent).toBe('merchant.storeDesign.images.error'));
  expect(saved).not.toHaveBeenCalled();
  expect(document.querySelector('img').getAttribute('src')).toBe('https://example.com/existing.webp');
});
