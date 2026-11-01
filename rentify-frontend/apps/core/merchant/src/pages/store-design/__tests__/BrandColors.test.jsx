// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { BrandColors, mergeBrandColors } from '../components/BrandColors';
const api = vi.hoisted(() => ({ save: vi.fn(), unwrap: vi.fn() }));
vi.mock('@rentify/apis/apis/websiteApi', () => ({ useUpdateThemeConfigurationMutation: () => [api.save, { isLoading: false }] }));
const t = (key) => key;
beforeEach(() => { api.save.mockReset(); api.unwrap.mockReset(); api.save.mockReturnValue({ unwrap: api.unwrap }); });
afterEach(cleanup);
test('chooses the coordinated navy, white and blue palette and preserves other theme settings', async () => {
  api.unwrap.mockResolvedValue({ success: true }); const onSaved = vi.fn();
  const theme = { typography: { fontFamily: { primary: 'Inter' } }, colors: { text: '#111111', border: '#dddddd' } };
  render(<BrandColors websiteId="website-a" savedTheme={theme} onSaved={onSaved} t={t} />);
  fireEvent.click(screen.getByRole('button', { name: 'Midnight Tech' }));
  expect(screen.getByLabelText('merchant.storeDesign.colors.secondary').value).toBe('#0b1728');
  fireEvent.click(screen.getByRole('button', { name: 'merchant.storeDesign.colors.save' }));
  expect(api.save).toHaveBeenCalledWith({ websiteId: 'website-a', theme: { ...theme, colors: { ...theme.colors, primary: '#2563eb', secondary: '#0b1728', background: '#ffffff' } } });
  await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
  expect(screen.getByRole('status').textContent).toBe('merchant.storeDesign.colors.saved');
});
test('reports failed saves without reporting success', async () => {
  api.unwrap.mockRejectedValue(new Error('offline')); const onSaved = vi.fn();
  render(<BrandColors websiteId="website-a" onSaved={onSaved} t={t} />);
  fireEvent.click(screen.getByRole('button', { name: 'merchant.storeDesign.colors.save' }));
  await waitFor(() => expect(screen.getByRole('status').textContent).toBe('merchant.storeDesign.colors.error'));
  expect(onSaved).not.toHaveBeenCalled();
});
test('accepts historical JSON themes and keeps typography when merging colors', () => {
  expect(mergeBrandColors('{"typography":{"fontSize":{"base":"16px"}}}', { primary: '#123456' })).toEqual({ typography: { fontSize: { base: '16px' } }, colors: { primary: '#123456' } });
  expect(mergeBrandColors('invalid', { primary: '#123456' })).toEqual({ colors: { primary: '#123456' } });
});
