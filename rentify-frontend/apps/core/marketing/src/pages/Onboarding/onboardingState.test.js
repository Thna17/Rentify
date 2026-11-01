import { describe, expect, it } from 'vitest';
import { ONBOARDING_PATHS, STEPS, classifyOnboardingError, completionState, deriveResumeStep, safeDraft } from './onboardingState';
import { startSellingCopy } from './startSellingCopy';

const verifiedUser = { id: 'merchant-1', isVerified: true };

describe('Store-first onboarding state', () => {
  it('keeps marketplace-only merchants independent from a Website', () => {
    const store = { id: 'store-1', marketplaceApprovalStatus: 'pending', websiteId: null };
    expect(deriveResumeStep({ user: verifiedUser, store, draft: safeDraft({ path: ONBOARDING_PATHS.MARKETPLACE }) })).toBe(STEPS.COMPLETE);
    expect(completionState(store)).toBe('approval_pending');
  });

  it('resumes the storefront path at template selection without recreating the Store', () => {
    const store = { id: 'store-1', marketplaceApprovalStatus: 'approved', websiteId: null };
    expect(deriveResumeStep({ user: verifiedUser, store, draft: safeDraft({ path: ONBOARDING_PATHS.STOREFRONT, step: STEPS.TEMPLATE }) })).toBe(STEPS.TEMPLATE);
    expect(completionState({ ...store, websiteId: 'website-1', websiteStatus: 'customization' })).toBe('storefront_customization');
  });

  it('uses authoritative identity state before a locally saved step', () => {
    expect(deriveResumeStep({ user: null, store: null, draft: safeDraft({ step: STEPS.COMPLETE }) })).toBe(STEPS.ACCOUNT);
    expect(deriveResumeStep({ user: { isVerified: false }, store: null, draft: safeDraft({ step: STEPS.COMPLETE }) })).toBe(STEPS.CONTACT);
  });

  it('maps offline, timeout, forbidden and conflict failures to recovery states', () => {
    expect(classifyOnboardingError(new TypeError('network'), false)).toBe('offline');
    expect(classifyOnboardingError({ name: 'AbortError' }, true)).toBe('timeout');
    expect(classifyOnboardingError({ status: 403 }, true)).toBe('forbidden');
    expect(classifyOnboardingError({ status: 409 }, true)).toBe('conflict');
  });

  it('keeps English and Khmer onboarding catalogues in parity', () => {
    expect(Object.keys(startSellingCopy.KH).sort()).toEqual(Object.keys(startSellingCopy.EN).sort());
    expect(startSellingCopy.KH.title).toMatch(/[\u1780-\u17ff]/);
    expect(startSellingCopy.EN.marketTitle).toBe('Marketplace');
  });

  it('rejects stale or unverified client payment state without completed server status', () => {
    const isPaymentStepComplete = (payment, plan) =>
      Boolean(
        payment?.packageId === plan?.id &&
        payment?.paymentId &&
        payment?.status === 'completed'
      );

    const plan = { id: 'starter-plan', price: 5 };
    // Mismatched plan
    expect(isPaymentStepComplete({ paymentId: 'pay-1', packageId: 'other-plan', status: 'completed' }, plan)).toBe(false);
    // Missing completed status (stale or pending)
    expect(isPaymentStepComplete({ paymentId: 'pay-1', packageId: 'starter-plan', status: 'pending' }, plan)).toBe(false);
    expect(isPaymentStepComplete({ paymentId: 'pay-1', packageId: 'starter-plan' }, plan)).toBe(false);
    // Verified completed payment
    expect(isPaymentStepComplete({ paymentId: 'pay-1', packageId: 'starter-plan', status: 'completed' }, plan)).toBe(true);
  });
});
