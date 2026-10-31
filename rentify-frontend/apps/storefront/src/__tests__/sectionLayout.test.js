// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { normalizeLayout, previewTemplateId, serializeLayout, TEMPLATE_SECTIONS, useSectionLayout } from '@rentify/storefront/preview';

vi.mock('@rentify/storefront/website', () => ({
  useStorefrontWebsite: () => ({ content: [{ label: 'Page Layout', value: { 1: 'newArrivals,-categories,categoryRows' } }] }),
}));

describe('home section layout', () => {
  test('keeps known sections in the given order and appends the rest visible', () => {
    expect(normalizeLayout(3, 'visit,-menu,unknown,visit')).toEqual([
      { id: 'visit', hidden: false },
      { id: 'menu', hidden: true },
      { id: 'highlights', hidden: false },
      { id: 'signature', hidden: false },
      { id: 'feature', hidden: false },
      { id: 'story', hidden: false },
    ]);
  });

  test('falls back to the template default and round-trips through the string form', () => {
    const defaults = normalizeLayout(2, null);
    expect(defaults.map((item) => item.id)).toEqual(TEMPLATE_SECTIONS[2]);
    const edited = [{ ...defaults[1], hidden: true }, defaults[0], ...defaults.slice(2)];
    expect(normalizeLayout(2, serializeLayout(edited))).toEqual(edited);
    expect(normalizeLayout(999, 'hero')).toEqual([]);
  });
});

describe('template preview override', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState(null, '', '/');
  });

  test('is ignored outside a frame', () => {
    window.history.replaceState(null, '', '/?previewTemplate=3');
    expect(previewTemplateId()).toBeNull();
  });

  test('an unframed shopper sees saved layout and ignores preview parameters', () => {
    window.history.replaceState(null, '', '/?previewLayout=categories');
    const { result } = renderHook(() => useSectionLayout(1));
    expect(result.current('categories')).toBeNull();
    expect(result.current('newArrivals')).toEqual({ order: 1 });
  });

  test('applies only known templates while framed', () => {
    vi.spyOn(window, 'top', 'get').mockReturnValue({});
    window.history.replaceState(null, '', '/?previewTemplate=3');
    expect(previewTemplateId()).toBe(3);
    window.history.replaceState(null, '', '/?previewTemplate=42');
    expect(previewTemplateId()).toBeNull();
    vi.restoreAllMocks();
  });
});
