import { describe, expect, it } from 'vitest';
import { resolveAuthDestination } from '../authUtils';

describe('resolveAuthDestination', () => {
  it('redirects merchant without a store to explicit onboarding returnUrl', () => {
    const config = {
      redirectUrl: 'https://rentify.mekhla.digital/onboarding/starter',
      hasExplicitReturnUrl: true,
      returnDomain: 'rentify.mekhla.digital',
      adminDashboardHost: 'rentify-admin.mekhla.digital',
      isMarketplace: false,
      isPOS: false,
      isHostedStorefrontBuyer: false,
      isWebsiteTemplate: false,
    };

    const destination = resolveAuthDestination({
      hasStore: false,
      isStaff: false,
      role: 'user',
      config,
    });

    expect(destination).toBe('https://rentify.mekhla.digital/onboarding/starter');
  });

  it('redirects merchant without a store to marketingStartUrl when no explicit returnUrl', () => {
    const config = {
      redirectUrl: 'https://rentify.mekhla.digital',
      hasExplicitReturnUrl: false,
      returnDomain: 'rentify.mekhla.digital',
      adminDashboardHost: 'rentify-admin.mekhla.digital',
      isMarketplace: false,
      isPOS: false,
      isHostedStorefrontBuyer: false,
      isWebsiteTemplate: false,
    };

    const destination = resolveAuthDestination({
      hasStore: false,
      isStaff: false,
      role: 'user',
      config,
    });

    expect(destination).toContain('/start');
  });

  it('redirects merchant with store to dashboard', () => {
    const config = {
      redirectUrl: 'https://rentify.mekhla.digital/onboarding/starter',
      hasExplicitReturnUrl: true,
      returnDomain: 'rentify.mekhla.digital',
      adminDashboardHost: 'rentify-admin.mekhla.digital',
      isMarketplace: false,
      isPOS: false,
      isHostedStorefrontBuyer: false,
      isWebsiteTemplate: false,
    };

    const destination = resolveAuthDestination({
      hasStore: true,
      isStaff: false,
      role: 'user',
      config,
    });

    expect(destination).toContain('/overview');
  });
});
