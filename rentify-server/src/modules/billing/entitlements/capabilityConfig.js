// rentify-server/src/modules/billing/entitlements/capabilityConfig.js
// Canonical versioned capability configuration and tier definitions for Release 1.

const CAPABILITIES_VERSION = 1;

const LIFECYCLE_STATES = {
  ACTIVE: 'active',
  TRIAL: 'trial',
  GRACE_PERIOD: 'grace_period',
  SUSPENDED: 'suspended',
  CANCELLED: 'cancelled',
};

const POLICY_CONSTANTS = {
  GRACE_PERIOD_DAYS: 7,
  HISTORICAL_ACCESS_DAYS: 90,
  MARKETPLACE_PILOT_DAYS: 180, // 6 months pilot for marketplace-only
  DEFAULT_TRIAL_DAYS: 14,
};

const CAPABILITY_TIERS = {
  free_pilot: {
    tier: 'free_pilot',
    displayName: 'Free',
    description: 'Free plan with branded storefront and marketplace listing',
    price: 0,
    duration: '1 month',
    isPilot: false,
    capabilities: {
      marketplaceListing: true,
      website: true,
      productLimit: 25,
      staffLimit: 1,
      pos: true,
      invoices: true,
      customDomainBrowse: false,
      hostedCheckout: true,
      historicalOrderRead: true,
    },
  },
  starter: {
    tier: 'starter',
    displayName: 'Starter',
    description: 'Shop with storefront, counter POS, and 100-product catalog',
    price: 8,
    duration: '1 month',
    trialDays: 14,
    capabilities: {
      marketplaceListing: true,
      website: true,
      productLimit: 100,
      staffLimit: 2,
      pos: true,
      invoices: true,
      customDomainBrowse: false,
      hostedCheckout: true,
      historicalOrderRead: true,
    },
  },
  business: {
    tier: 'business',
    displayName: 'Pro',
    description: 'Growing shop with custom domain, 5 staff accounts, and 500-product catalog',
    price: 15,
    duration: '1 month',
    trialDays: 14,
    capabilities: {
      marketplaceListing: true,
      website: true,
      productLimit: 500,
      staffLimit: 5,
      pos: true,
      invoices: true,
      customDomainBrowse: true,
      hostedCheckout: true,
      historicalOrderRead: true,
    },
  },
};

/**
 * Resolves capability tier from a Package record or tier identifier.
 * Preserves full compatibility with legacy packages.
 */
function resolveTier(pkgOrTier) {
  if (!pkgOrTier) return CAPABILITY_TIERS.free_pilot;

  if (typeof pkgOrTier === 'string') {
    const key = pkgOrTier.toLowerCase().trim();
    if (key === 'free' || key === 'free_pilot' || key === 'pilot' || key === 'marketplace_pilot') {
      return CAPABILITY_TIERS.free_pilot;
    }
    if (key === 'starter') return CAPABILITY_TIERS.starter;
    if (key === 'business' || key === 'pro' || key === 'enterprise') return CAPABILITY_TIERS.business;
    return CAPABILITY_TIERS[key] || CAPABILITY_TIERS.free_pilot;
  }

  // Object (Package record or custom object)
  if (pkgOrTier.tier && CAPABILITY_TIERS[pkgOrTier.tier]) {
    return CAPABILITY_TIERS[pkgOrTier.tier];
  }

  const name = String(pkgOrTier.name || '').toLowerCase();
  const price = Number(pkgOrTier.price || 0);

  if (name.includes('starter')) {
    return CAPABILITY_TIERS.starter;
  }
  if (name.includes('business') || name.includes('pro') || name.includes('enterprise') || price >= 15) {
    return CAPABILITY_TIERS.business;
  }
  if (price > 0 && price < 15) {
    return CAPABILITY_TIERS.starter;
  }
  return CAPABILITY_TIERS.free_pilot;
}

module.exports = {
  CAPABILITIES_VERSION,
  LIFECYCLE_STATES,
  POLICY_CONSTANTS,
  CAPABILITY_TIERS,
  resolveTier,
};
