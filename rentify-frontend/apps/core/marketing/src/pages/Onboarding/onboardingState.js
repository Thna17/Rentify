export const ONBOARDING_STORAGE_KEY = 'rentify-merchant-onboarding-v2';

export const ONBOARDING_PATHS = Object.freeze({
  MARKETPLACE: 'marketplace',
  STOREFRONT: 'storefront',
});

export const STEPS = Object.freeze({
  ACCOUNT: 'account',
  CONTACT: 'contact',
  PATH: 'path',
  DETAILS: 'details',
  TEMPLATE: 'template',
  COMPLETE: 'complete',
});

export const emptyDraft = Object.freeze({
  path: '',
  name: '',
  primaryCategory: '',
  email: '',
  contact: '',
  location: '',
  templateId: '',
  packageId: '',
  step: STEPS.ACCOUNT,
});

export function safeDraft(value) {
  if (!value || typeof value !== 'object') return { ...emptyDraft };
  const path = Object.values(ONBOARDING_PATHS).includes(value.path) ? value.path : '';
  const step = Object.values(STEPS).includes(value.step) ? value.step : STEPS.ACCOUNT;
  return Object.fromEntries(
    Object.keys(emptyDraft).map((key) => [
      key,
      key === 'path' ? path : key === 'step' ? step : typeof value[key] === 'string' ? value[key].slice(0, 240) : '',
    ])
  );
}

export function deriveResumeStep({ user, store, draft }) {
  if (!user) return STEPS.ACCOUNT;
  if (!user.isVerified) return STEPS.CONTACT;
  if (store?.websiteId) return STEPS.COMPLETE;
  if (store) {
    return draft.path === ONBOARDING_PATHS.STOREFRONT ? STEPS.TEMPLATE : STEPS.COMPLETE;
  }
  if (!draft.path) return STEPS.PATH;
  if (!draft.name || !draft.primaryCategory) return STEPS.DETAILS;
  return STEPS.DETAILS;
}

export function classifyOnboardingError(error, online = true) {
  if (!online || error?.name === 'TypeError') return 'offline';
  if (error?.name === 'AbortError') return 'timeout';
  if (error?.status === 401) return 'unauthorized';
  if (error?.status === 403) return 'forbidden';
  if (error?.status === 409) return 'conflict';
  if (error?.status >= 500) return 'server';
  return 'validation';
}

export function completionState(store) {
  if (!store) return 'incomplete';
  if (store.websiteId && store.websiteStatus === 'active') return 'storefront_live';
  if (store.websiteId) return 'storefront_customization';
  if (store.marketplaceApprovalStatus === 'approved' && store.marketplaceEnabled) return 'marketplace_ready';
  if (store.marketplaceApprovalStatus === 'needs_changes' || store.marketplaceApprovalStatus === 'rejected') return 'needs_changes';
  if (store.marketplaceApprovalStatus === 'suspended') return 'suspended';
  return 'approval_pending';
}

export function emitOnboardingEvent(event, properties = {}) {
  if (typeof window === 'undefined') return;
  const allowed = ['path', 'step', 'status', 'result', 'hasStore', 'hasWebsite'];
  const safeProperties = Object.fromEntries(
    Object.entries(properties).filter(([key, value]) => allowed.includes(key) && ['string', 'boolean', 'number'].includes(typeof value))
  );
  window.dispatchEvent(new CustomEvent('rentify:onboarding', { detail: { event, ...safeProperties } }));
}
