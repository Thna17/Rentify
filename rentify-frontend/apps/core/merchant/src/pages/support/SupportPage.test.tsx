// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import SupportPage from './SupportCases';

vi.mock('@rentify/utils', () => ({ useTranslation: () => ({ language: 'en' }) }));
vi.mock('@rentify/shared/config/urls', () => ({ RENTIFY_API_BASE: 'https://core.example.test' }));
const detail = { id: 'case-1', caseNumber: 'SC-1', summary: 'Need help', status: 'in_progress', version: 3,
  notes: [{ id: 'note-1', body: 'A merchant-visible reply', createdAt: '2026-01-01T00:00:00Z' }] };

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('merchant support', () => {
  it('loads an owned case and sends a versioned idempotent response', async () => {
    const fetcher = vi.fn(async (url: string, options?: RequestInit) => {
      if (options?.method === 'POST') return { ok: true, json: async () => ({ data: { ...detail, version: 4 } }) };
      if (url.endsWith('/case-1')) return { ok: true, json: async () => ({ data: detail }) };
      return { ok: true, json: async () => ({ data: [detail], page: { nextCursor: null } }) };
    });
    vi.stubGlobal('fetch', fetcher);
    render(<SupportPage />);
    fireEvent.click(await screen.findByRole('button', { name: /SC-1.*Need help/ }));
    expect(await screen.findByText('A merchant-visible reply')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Your response'), { target: { value: 'Thank you' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send response' }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledWith(expect.stringContaining('/case-1/responses'), expect.objectContaining({ method: 'POST' })));
    const call = fetcher.mock.calls.find(([, options]) => options?.method === 'POST');
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ expectedVersion: 3, body: 'Thank you' });
    expect((call?.[1]?.headers as Record<string, string>)['Idempotency-Key']).toBeTruthy();
  });

  it('shows a retryable error when the case list fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    render(<SupportPage />);
    expect((await screen.findByRole('alert')).textContent).toContain('Support cases could not be loaded.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });
});
