import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

// The merchant dashboard draws every colour from its theme (DEC-030): theme classes (primary,
// muted, border, ...) and the shared status tokens. Raw Tailwind palette colours made each page
// look slightly different, so they are not allowed back in.
const SRC = resolve(__dirname, '../..');
const ALLOWED = [
  'pages/invoice-manual/components/InvoicePreview.jsx', // the printed invoice's own design
  'pages/invoice-manual/components/InvoicePDF.jsx',
  'pages/invoice-manual/components/InvoiceDocument.jsx',
  'pages/store-management/components/ColorPicker.tsx', // storefront palette swatches are data
  'pages/store-design/', // template previews show storefront colours
];
const RAW = /(?<![\w-])(?:[a-z-]+:)*(?:bg|text|border|ring|divide|outline|from|to|via|fill|stroke)-(?:amber|sky|violet|purple|slate|emerald|rose|red|green|blue|orange|yellow|indigo|teal|cyan|pink|gray|zinc|lime|fuchsia|stone|neutral)-\d{2,3}\b/g;

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return files(full);
    return /\.(tsx|jsx|ts|js)$/.test(name) && !/\.test\./.test(name) ? [full] : [];
  });

describe('Merchant colours come from the theme', () => {
  it('uses no raw Tailwind palette colours', () => {
    const offenders = files(SRC)
      .map((file) => relative(SRC, file).replace(/\\/g, '/'))
      .filter((rel) => !ALLOWED.some((allowed) => rel.startsWith(allowed)))
      .flatMap((rel) => (readFileSync(join(SRC, rel), 'utf-8').match(RAW) || []).map((cls) => `${rel}: ${cls}`));
    expect(offenders).toEqual([]);
  });
});
