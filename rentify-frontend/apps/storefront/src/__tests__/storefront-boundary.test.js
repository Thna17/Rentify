import { describe, expect, test } from 'vitest';
import { STOREFRONT_SHELL_ENTRY, findBoundaryViolations } from '../../../../tools/storefront-boundary.mjs';

describe('storefront app boundary', () => {
  const { graph, violations } = findBoundaryViolations(STOREFRONT_SHELL_ENTRY);

  test('reaches both templates but no merchant, admin, staff or payment-configuration code', () => {
    expect(violations).toEqual([]);
    expect(graph.unresolved).toEqual([]);
    expect(graph.files).toEqual(
      expect.arrayContaining([
        'apps/templates/ecommerce/ecommerce-template-1/src/app.jsx',
        'apps/templates/ecommerce/ecommerce-template-2/src/app.jsx',
        'libs/storefront/src/website.tsx',
      ])
    );
    expect(graph.files.some((file) => file.startsWith('apps/core/'))).toBe(false);
  });
});
