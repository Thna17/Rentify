import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const page = read('apps/core/merchant/src/pages/product-imports/ProductImports.tsx');
const api = read('apps/core/merchant/src/pages/product-imports/productImportApi.ts');
const routes = read('apps/core/merchant/src/routes/dashboardRoutes.jsx');
const en = JSON.parse(read('libs/utils/src/locales/en.json')).dashboard.imports;
const kh = JSON.parse(read('libs/utils/src/locales/kh.json')).dashboard.imports;

test('P4-MER-004 merchant route uses one Store-scoped Commerce client boundary', () => {
  assert.match(routes, /path: 'products\/import'/);
  assert.match(api, /commerceClient\.request/);
  assert.match(api, /\/api\/stores\/\$\{storeId\}\/product-imports/);
  assert.doesNotMatch(api, /websiteId/);
  assert.doesNotMatch(api, /JSON\.parse\([^)]*CSV|split\(['"]\\n/);
});

test('P4-MER-004 UI exposes partial results, resume, correction, and responsive row cards', () => {
  assert.match(page, /partial_explanation/);
  assert.match(page, /onRetry/);
  assert.match(page, /Correction report|dashboard\.imports\.report/);
  assert.match(page, /md:hidden/);
  assert.match(page, /hidden overflow-x-auto md:block/);
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /aria-describedby="product-import-help"/);
});

test('P4-MER-004 accessible keyboard actions and resilient recovery controls', () => {
  assert.match(page, /focus-visible:ring-2/);
  assert.match(page, /role="status"/);
  assert.match(page, /aria-label=\{t\('dashboard\.imports\.refresh'\)\}/);
  assert.match(page, /aria-label=\{t\('dashboard\.imports\.summary'\)\}/);
  assert.match(page, /aria-describedby="product-import-help"/);
});

test('P4-MER-004 English and Khmer cover every workflow and recovery key', () => {
  assert.deepEqual(Object.keys(kh).sort(), Object.keys(en).sort());
  for (const key of [
    'partial_explanation', 'cancel_guidance', 'forbidden_message', 'timeout_message',
    'offline_message', 'conflict_message', 'status_completed_with_errors',
    'issue_UNSAFE_SPREADSHEET_FORMULA', 'issue_SKU_ALREADY_EXISTS',
  ]) {
    assert.ok(en[key]);
    assert.ok(kh[key]);
    assert.notEqual(kh[key], en[key]);
  }
});
