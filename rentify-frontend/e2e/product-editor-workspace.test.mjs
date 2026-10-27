import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const routes = read('apps/core/merchant/src/routes/dashboardRoutes.jsx');
const editor = read('apps/core/merchant/src/pages/product-editor/ProductEditor.tsx');
const model = read('apps/core/merchant/src/pages/product-editor/productEditorModel.ts');
const catalog = read('apps/core/merchant/src/pages/product-editor/ProductCatalog.tsx');
const api = read('apps/core/merchant/src/pages/product-editor/productEditorApi.ts');
const copy = read('apps/core/merchant/src/pages/product-editor/productEditorCopy.ts');

test('P4-MER-003 keeps product URLs on one Store-first editor and redirects the old catalog', () => {
  assert.match(routes, /path: 'products\/create', element: <ProductEditor/);
  assert.match(routes, /path: 'products\/edit\/:id', element: <ProductEditor/);
  assert.match(routes, /path: 'products\/:id', element: <ProductEditor/);
  assert.match(routes, /path: 'catalog', element: <Navigate to="\/products" replace/);
  assert.doesNotMatch(api, /websiteId/);
  assert.match(api, /commerceClient\.request/);
});

test('P4-MER-003 exposes simple and variant SKU editing with semantic labels and recovery', () => {
  assert.match(editor, /<fieldset/);
  assert.match(editor, /<legend className="sr-only">/);
  assert.match(editor, /blankVariant/);
  assert.match(model, /expectedVersion/);
  assert.match(model, /replaceVariants/);
  assert.match(editor, /WorkspaceState kind=\{state\}/);
  assert.match(editor, /onError=/);
  assert.match(catalog, /sm:grid-cols/);
  assert.match(catalog, /aria-label=\{text\.search\}/);
});

test('P4-MER-003 English and Khmer have identical complete editor keys', async () => {
  assert.match(copy, /en:/);
  assert.match(copy, /kh:/);
  const module = await import('../apps/core/merchant/src/pages/product-editor/productEditorCopy.ts');
  assert.deepEqual(Object.keys(module.productEditorCopy.en), Object.keys(module.productEditorCopy.kh));
  assert.ok(module.productEditorCopy.kh.skuHelp.length > 20);
});
