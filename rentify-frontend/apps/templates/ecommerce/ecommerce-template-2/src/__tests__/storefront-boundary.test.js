import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, test } from 'vitest';
import { findBoundaryViolations, TEMPLATE_2_ENTRY } from '../../../../../../tools/storefront-boundary.mjs';

describe('Template 2 storefront boundary', () => {
  const { graph, violations } = findBoundaryViolations(TEMPLATE_2_ENTRY);

  test('does not import merchant dashboard, admin, staff or payment-configuration modules', () => {
    expect(violations).toEqual([]);
  });

  test('walks the real module graph, including lazy routes and the shared storefront contract', () => {
    expect(graph.unresolved).toEqual([]);
    expect(graph.files).toEqual(
      expect.arrayContaining([
        'apps/templates/ecommerce/ecommerce-template-2/src/pages/Checkout.jsx',
        'libs/storefront/src/api.js',
        'libs/storefront/src/website.tsx',
      ])
    );
  });

  describe('detects violations', () => {
    const dir = mkdtempSync(join(tmpdir(), 'storefront-boundary-'));
    afterAll(() => rmSync(dir, { recursive: true, force: true }));

    test.each([
      ["import { useGetStaffListQuery } from '@rentify/apis/apis/staffManagementApi';", 'staff module'],
      ["import '@rentify/apis/apis/paymentConfigApi';", 'merchant payment configuration / payment administration'],
      ["export * from '@rentify/storefront/ownerSessionApi';", 'store-owner / staff mode of the shared storefront'],
      ["const Page = () => import('@rentify/apis');", 'full platform API barrel (admin, merchant, staff endpoints)'],
    ])('%s', (source, reason) => {
      const entry = join(dir, `entry-${reason.length}.js`);
      writeFileSync(entry, `${source}\n`);
      const result = findBoundaryViolations(entry);
      expect(result.violations.map((violation) => violation.reason)).toContain(reason);
    });

    test('another template', () => {
      const otherTemplate = fileURLToPath(new URL('../../../ecommerce-template-1/src/theme.js', import.meta.url));
      const entry = join(dir, 'entry-other-template.js');
      writeFileSync(entry, `import './${relative(dir, otherTemplate)}';\n`);
      const result = findBoundaryViolations(entry);
      expect(result.violations.map((violation) => violation.reason)).toContain('another template');
    });
  });
});
