import { describe, expect, it } from 'vitest';
import { actionLabel, actionTarget, checklistCopy, itemLabels, reasonLabel } from './launchChecklistModel';

describe('merchant launch checklist presentation contract', () => {
  it('covers every checklist status in English and Khmer', () => {
    const statuses = ['complete', 'incomplete', 'blocked', 'pending', 'failed'] as const;
    for (const locale of ['en', 'kh'] as const) {
      const copy = checklistCopy(locale);
      statuses.forEach((status) => expect(copy.status[status]).not.toBe(status));
      expect(copy.completeLabel(4, 11)).toContain('4');
      expect(copy.completeLabel(4, 11)).toContain('11');
    }
  });

  it('keeps marketplace-only and storefront item labels localized', () => {
    for (const locale of ['en', 'kh'] as const) {
      expect(itemLabels[locale].publication_marketplace).toBeTruthy();
      expect(itemLabels[locale].storefront_readiness).toBeTruthy();
      expect(itemLabels[locale].publication_storefront).toBeTruthy();
    }
  });

  it('localizes loading, empty, forbidden, offline, timeout, error, and stale recovery states', () => {
    for (const locale of ['en', 'kh'] as const) {
      const copy = checklistCopy(locale);
      for (const key of ['loading', 'emptyTitle', 'forbiddenTitle', 'offlineTitle', 'timeoutTitle', 'errorTitle', 'staleTitle', 'retry'] as const) {
        expect(copy[key]).toBeTruthy();
      }
    }
  });

  it('gives blocked server reason codes a concrete localized reason and action', () => {
    for (const locale of ['en', 'kh'] as const) {
      expect(reasonLabel('VALID_SKU_REQUIRED', locale)).toBeTruthy();
      expect(reasonLabel('COMMERCE_FACTS_TIMEOUT', locale)).toBeTruthy();
      expect(actionLabel('ADD_SKU', locale)).toBeTruthy();
      expect(actionLabel('RETRY_CHECKLIST', locale)).toBeTruthy();
    }
    expect(actionTarget('ADD_SKU')).toBe('/products');
    expect(actionTarget('SUBMIT_APPLICATION')).toBe('/marketplace-readiness');
    expect(actionTarget('RETRY_CHECKLIST')).toBeNull();
  });
});
