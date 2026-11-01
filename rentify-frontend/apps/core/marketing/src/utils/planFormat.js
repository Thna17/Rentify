// Helpers that turn raw package data from the API into readable, translated text

const UNIT_KEYS = {
  day: 'site.common.units.day',
  days: 'site.common.units.days',
  month: 'site.common.units.month',
  months: 'site.common.units.months',
  year: 'site.common.units.year',
  years: 'site.common.units.years',
};

// "14 days" -> "14 days" / "14 ថ្ងៃ"
export const formatDuration = (duration, t) => {
  const match = String(duration || '').match(/^(\d+)\s*([a-z]+)$/i);
  if (!match) return duration || '';
  const [, amount, unit] = match;
  const key = UNIT_KEYS[unit.toLowerCase()];
  return key ? `${amount} ${t(key)}` : duration;
};

// Billing period shown after a price: "/mo", "/yr" or "Free forever"
export const formatPeriod = (plan, t) => {
  const duration = String(plan?.duration || '').toLowerCase();
  if (Number(plan?.price) === 0) {
    return t('site.common.perMonth');
  }
  if (duration === '1 month') return t('site.common.perMonth');
  if (duration === '1 year') return t('site.common.perYear');
  return `/ ${formatDuration(plan?.duration, t)}`;
};

// 1024 (MB) -> "1 GB"
export const formatStorage = (megabytes) => {
  const value = Number(megabytes) || 0;
  if (value >= 1024) return `${Math.round((value / 1024) * 10) / 10} GB`;
  return `${value} MB`;
};

export const formatPrice = (price) => {
  const value = Number(price) || 0;
  return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`;
};

// Approximate riel price, rounded to the nearest 1,000
export const KHR_PER_USD = 4000;
export const formatRiel = (price) =>
  `${(Math.round((Number(price) * KHR_PER_USD) / 1000) * 1000).toLocaleString(
    'en-US'
  )}៛`;

// Canonical tier identification
export const planTierKey = (plan, index = 0) => {
  const name = String(plan?.name || '').trim().toLowerCase();
  const price = Number(plan?.price || 0);
  if (name === 'free' || (price === 0 && index === 0)) return 'free';
  if (name === 'starter' || (price > 0 && price <= 8)) return 'starter';
  if (name === 'pro' || price >= 15) return 'pro';
  if (index === 0) return 'free';
  if (index === 1) return 'starter';
  return 'pro';
};

export const planWhoItsFor = (plan, index = 0) => {
  if (plan?.limits?.whoItsFor) return plan.limits.whoItsFor;
  const key = planTierKey(plan, index);
  if (key === 'free') return 'Micro-seller, new seller';
  if (key === 'starter') return 'Shop with a counter or brand';
  return 'Growing shop & brand';
};

export const planCommission = (plan) =>
  plan?.limits?.commission || 'Only on marketplace orders';

export const planHasStoreAndCatalog = () => true;
export const planHasMarketplace = () => true;
export const planHasOwnStorefront = () => true;

export const planHasPos = (plan, index = 0) => {
  if (typeof plan?.limits?.pos === 'boolean') {
    return plan.limits.pos;
  }
  const key = planTierKey(plan, index);
  return key === 'starter' || key === 'pro' || Number(plan?.price) > 0;
};

export const planHasProTools = (plan, index = 0) => {
  if (typeof plan?.limits?.proTools === 'boolean') {
    return plan.limits.proTools;
  }
  const key = planTierKey(plan, index);
  return key === 'pro' || Number(plan?.price) >= 15;
};

export const formatColumnHeading = (plan, index = 0) => {
  const key = planTierKey(plan, index);
  const price = Number(plan?.price || 0);
  if (key === 'free' || price === 0) return 'Free';
  return `${plan?.name || (key === 'starter' ? 'Starter' : 'Pro')} (≈$${price}/mo)`;
};

// Slug-style features returned by the packages API
const FEATURE_KEYS = {
  'basic-dashboard': 'dashboard',
  'product-management': 'productManagement',
  'order-management': 'orderManagement',
  store: 'onlineStore',
  'advanced-analytics': 'advancedAnalytics',
  invoice: 'invoices',
  pos: 'pos',
  'standard analytics': 'standardAnalytics',
  'vite storefront': 'onlineStore',
  'custom domain': 'customDomain',
  'telegram order notifications': 'telegramAlerts',
  'khqr payments': 'khqr',
  'multi-storefront': 'multiStore',
  'dedicated support': 'dedicatedSupport',
  'custom integrations': 'customIntegrations',
};

const COUNT_NOUNS = {
  product: 'products',
  products: 'products',
  store: 'stores',
  stores: 'stores',
  staff: 'staff',
  'staff members': 'staff',
  'staff member': 'staff',
};

export const CORE_FEATURES = [
  'basic-dashboard',
  'product-management',
  'order-management',
];

export const translateFeature = (feature, t) => {
  const normalized = String(feature).trim().toLowerCase();
  if (FEATURE_KEYS[normalized]) {
    return t(`site.plans.features.${FEATURE_KEYS[normalized]}`);
  }

  const count = normalized.match(/^(\d+|unlimited)\s+(.+)$/);
  if (count && COUNT_NOUNS[count[2]]) {
    const amount =
      count[1] === 'unlimited' ? t('site.plans.unlimited') : count[1];
    return `${amount} ${t(`site.plans.nouns.${COUNT_NOUNS[count[2]]}`)}`;
  }

  return feature;
};

// Canonical checklist rows shown on each plan card
export const planFeatureChecklist = (plan, index = 0) => {
  const items = [
    { label: 'Store and one catalog', included: true },
    { label: 'Sell on Rentify Marketplace', included: true },
    {
      label: 'Own storefront (subdomain + templates)',
      included: planHasOwnStorefront(plan, index),
    },
    {
      label: 'POS at the counter',
      included: planHasPos(plan, index),
    },
    {
      label: 'Custom domain, staff accounts, analytics, marketing tools',
      included: planHasProTools(plan, index),
    },
  ];
  return items;
};

export const planHighlights = (plan, t) =>
  planFeatureChecklist(plan)
    .filter((item) => item.included)
    .map((item) => item.label);

// starter / growth / scale, by position in the price-sorted list
export const planTier = (index, count) => {
  if (index === 0) return 'starter';
  if (index === count - 1 && count > 2) return 'scale';
  return 'growth';
};

const hasFeature = (plan, name) =>
  (plan?.features || []).some(
    (feature) => String(feature).toLowerCase() === name.toLowerCase()
  );

export const planIncludes = hasFeature;

export const planLimit = (plan, kind, t) => {
  const unlimited = (plan?.features || []).some((feature) =>
    new RegExp(`^unlimited ${kind}`, 'i').test(feature)
  );
  if (unlimited) return t('site.plans.unlimited');
  const value = plan?.limits?.[kind === 'staff' ? 'staff' : 'products'];
  return value != null ? Number(value).toLocaleString('en-US') : '—';
};
