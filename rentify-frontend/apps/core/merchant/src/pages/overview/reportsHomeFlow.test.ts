import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SRC = resolve(__dirname, '../..');
const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === '__tests__' ? [] : sourceFiles(full);
    return /\.(tsx|jsx)$/.test(name) && !/\.test\./.test(name) ? [full] : [];
  });

// Visible text only: JSX text nodes and string literals that are not comments or imports
const visibleStrings = (source: string) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/^import .*$/gm, '');

describe('Merchant screens never show internal text (CLAUDE.md, audit P7)', () => {
  const pages = sourceFiles(join(SRC, 'pages')).concat(sourceFiles(join(SRC, 'layouts')));

  it.each([
    ['decision codes', /DEC-\d{3}/],
    ['"Needs backend" markers', /Needs backend/i],
    ['task packet ids', /\bRX-[A-Z]\d+/],
    ['API paths', /['"`>]\s*(GET|POST|PUT)\s+\/api\//],
  ])('no %s in rendered strings', (_label, pattern) => {
    const offenders = pages.filter((file) => pattern.test(visibleStrings(readFileSync(file, 'utf-8'))));
    expect(offenders.map((f) => f.slice(SRC.length + 1))).toEqual([]);
  });
});

describe('Home, Reports and Returns use the shared order model', () => {
  it.each(['overview/Overview.tsx', 'overview/PlatformAnalytics.tsx', 'returns/ReturnsPage.tsx'])('%s reads orders through orderModel', (file) => {
    const source = readFileSync(join(SRC, 'pages', file), 'utf-8');
    expect(source).toContain("from '../order-management/orderModel'");
  });
});
