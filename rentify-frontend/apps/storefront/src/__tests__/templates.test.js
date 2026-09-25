import { describe, expect, test } from 'vitest';
import { TEMPLATE_LOADERS, templateFor } from '../templates';

describe('template selection', () => {
  test('serves Template 1 and Template 2, each as its own lazy chunk', () => {
    expect(Object.keys(TEMPLATE_LOADERS)).toEqual(['1', '2']);
    const first = templateFor({ websiteTemplateId: 1 });
    expect(first?.$$typeof).toBe(Symbol.for('react.lazy'));
    // The same component is reused, so React does not remount the store on re-render.
    expect(templateFor({ websiteTemplateId: '1' })).toBe(first);
    expect(templateFor({ websiteTemplateId: 2 })).not.toBe(first);
  });

  test('has nothing to show for unknown or missing templates', () => {
    for (const website of [undefined, null, {}, { websiteTemplateId: 3 }, { websiteTemplateId: 'abc' }]) {
      expect(templateFor(website)).toBeNull();
    }
  });
});
