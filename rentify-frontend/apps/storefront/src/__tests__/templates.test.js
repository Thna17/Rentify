import { describe, expect, test } from 'vitest';
import { TEMPLATE_LOADERS, templateFor } from '../templates';

describe('template selection', () => {
  test('serves Templates 1 to 10 as lazy components', () => {
    expect(Object.keys(TEMPLATE_LOADERS)).toEqual(Array.from({ length: 10 }, (_, index) => String(index + 1)));
    const first = templateFor({ websiteTemplateId: 1 });
    expect(first?.$$typeof).toBe(Symbol.for('react.lazy'));
    // The same component is reused, so React does not remount the store on re-render.
    expect(templateFor({ websiteTemplateId: '1' })).toBe(first);
    expect(templateFor({ websiteTemplateId: 2 })).not.toBe(first);
    expect(templateFor({ websiteTemplateId: 3 })?.$$typeof).toBe(Symbol.for('react.lazy'));
    expect(templateFor({ websiteTemplateId: 3 })).not.toBe(templateFor({ websiteTemplateId: 2 }));
    expect(templateFor({ websiteTemplateId: 4 })?.$$typeof).toBe(Symbol.for('react.lazy'));
  });

  test('has nothing to show for unknown or missing templates', () => {
    for (const website of [undefined, null, {}, { websiteTemplateId: 999 }, { websiteTemplateId: 'abc' }]) {
      expect(templateFor(website)).toBeNull();
    }
  });
});
