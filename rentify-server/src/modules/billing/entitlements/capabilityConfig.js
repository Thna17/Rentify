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
    displayName: 'Free Pilot',
    description: 'Marketplace-only six-month pilot for micro-merchants',
    price: 0,
    duration: '6 months',
    isPilot: true,
    capabilities: {
      marketplaceListing: true,
      website: false,
      productLimit: 25,
      staffLimit: 1,
      pos: true,
      invoices: true,
      customDomainBrowse: false,
      hostedCheckout: false,
      historicalOrderRead: true,
    },
  },
  starter: {
    tier: 'starter',
    displayName: 'Starter',
    description: 'Shop with a counter or brand storefront',
    price: 15,
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
    displayName: 'Business',
    description: 'Growing shop with custom domain and multiple staff',
    price: 35,
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

  if (name.includes('business') || name.includes('pro') || name.includes('enterprise') || price >= 30) {
    return CAPABILITY_TIERS.business;
  }
  if (name.includes('starter') || (price > 0 && price <= 25)) {
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
