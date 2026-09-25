// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const query = vi.fn();
vi.mock('@rentify/storefront/api', () => ({ useGetWebsiteByDomainQuery: (...args) => query(...args) }));
vi.mock('../templates', () => ({
  templateFor: (website) =>
    Number(website?.websiteTemplateId) === 2 ? () => <p>Template 2 for {website.websiteId}</p> : null,
}));

const { StorefrontShell } = await import('../StorefrontShell');

beforeEach(() => query.mockReset());
afterEach(cleanup);

describe('StorefrontShell', () => {
  test('looks the store up by the address it was opened on', async () => {
    query.mockReturnValue({ data: { websiteId: 'w-1', websiteTemplateId: 2 }, isLoading: false });
    render(<StorefrontShell host="aura.localhost:4900" />);
    expect(query).toHaveBeenCalledWith('aura.localhost:4900', { skip: false });
    expect(await screen.findByText('Template 2 for w-1')).toBeTruthy();
  });

  test('shows a loading state, then a clear message when no store answers', () => {
    query.mockReturnValue({ isLoading: true });
    const { rerender } = render(<StorefrontShell host="missing.localhost:4900" />);
    expect(screen.getByRole('status')).toBeTruthy();

    query.mockReturnValue({ isLoading: false, isError: true, error: { status: 404 } });
    rerender(<StorefrontShell host="missing.localhost:4900" />);
    expect(screen.getByRole('heading', { name: 'This store isn’t available' })).toBeTruthy();
  });

  test('offers a retry when the lookup fails for another reason', () => {
    const refetch = vi.fn();
    query.mockReturnValue({ isLoading: false, isError: true, error: { status: 'FETCH_ERROR' }, refetch });
    render(<StorefrontShell host="aura.localhost:4900" />);
    screen.getByRole('button', { name: 'Try again' }).click();
    expect(refetch).toHaveBeenCalled();
  });

  test('does not guess a template for a store it cannot serve', () => {
    query.mockReturnValue({ data: { websiteId: 'w-2', websiteTemplateId: 7 }, isLoading: false });
    render(<StorefrontShell host="odd.localhost:4900" />);
    expect(screen.getByRole('heading', { name: 'This store isn’t available' })).toBeTruthy();
  });
});
