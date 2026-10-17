// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, test, expect, describe } from 'vitest';
import { StorefrontUserMenu } from '@rentify/storefront';
import { AUTH_URL } from '@rentify/shared/config/urls';

const mockAuth = vi.hoisted(() => ({
  useStorefrontAuth: vi.fn(),
}));

vi.mock('@rentify/storefront/hooks/useStorefrontAuth', () => ({
  useStorefrontAuth: () => mockAuth.useStorefrontAuth(),
}));

describe('StorefrontUserMenu', () => {
  test('renders Sign In button when user is unauthenticated', () => {
    mockAuth.useStorefrontAuth.mockReturnValue({
      profile: null,
      isAuthenticated: false,
      isOwner: false,
      isMerchant: false,
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <StorefrontUserMenu />
      </MemoryRouter>
    );

    const signInBtn = screen.getByRole('link', { name: /sign in/i });
    expect(signInBtn).toBeTruthy();
    // Uses whichever public auth URL the build is configured with.
    expect(signInBtn.getAttribute('href').startsWith(`${AUTH_URL}?returnUrl=`)).toBe(true);
  });

  test('renders Store Owner mode and dashboard links when owner is logged in', () => {
    mockAuth.useStorefrontAuth.mockReturnValue({
      profile: {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Sarah Skincare Merchant',
        email: 'merchant@rentify.local',
        role: 'user',
      },
      isAuthenticated: true,
      isOwner: true,
      isMerchant: true,
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <StorefrontUserMenu />
      </MemoryRouter>
    );

    // Should show owner's name
    expect(screen.getByText('Sarah Skincare Merchant')).toBeTruthy();
  });
});
