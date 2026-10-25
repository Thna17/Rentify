#!/usr/bin/env node
'use strict';

// ecommerce-server/scripts/quality/check-no-direct-stock-writes.js
// P3-INV-002: Static enforcement preventing direct stock writes outside canonical inventory service.
// Verifies that application modules never import changeStock, sharedStockService, stockService,
// perform direct mutations on stockQuantity fields, or write to InventoryBalance/InventoryLedgerEntry
// outside the canonical inventoryLedgerService.

const fs = require('node:fs');
const path = require('node:path');

const targetPaths = process.argv.slice(2);
const dirsToCheck = targetPaths.length > 0 ? targetPaths : [
  'modules/checkout',
  'modules/orders',
  'modules/invoices',
  'modules/admin',
  'modules/catalog',
  'modules/store-catalog',
  'modules/cart',
  'modules/billing',
  'modules/payments',
  'modules/reviews',
  'modules/stats',
  'modules/store-access',
  'modules/websites',
];

const ROOT_DIR = path.resolve(__dirname, '../..');

let totalFilesChecked = 0;
const violations = [];

// Canonical files permitted to define compatibility adapters or update compatibility projections
const CANONICAL_INVENTORY_EXEMPTIONS = new Set([
  'modules/inventory/inventoryLedgerService.js',
  'modules/inventory/sharedStockService.js',
  'modules/inventory/stockService.js',
  'modules/inventory/index.js',
]);

// Patterns indicating forbidden direct stock mutations
const FORBIDDEN_IMPORT_PATTERNS = [
  { pattern: /require\s*\(\s*['"][^'"]*sharedStockService[^'"]*['"]\s*\)/, reason: 'Direct require of sharedStockService' },
  { pattern: /require\s*\(\s*['"][^'"]*stockService[^'"]*['"]\s*\)/, reason: 'Direct require of stockService' },
  { pattern: /{\s*changeStock\s*}/, reason: 'Direct import of changeStock' },
  { pattern: /\bsharedStockService\b/, reason: 'Direct use of sharedStockService' },
  { pattern: /\bchangeStock\s*\(/, reason: 'Direct invocation of changeStock()' },
];

const FORBIDDEN_DIRECT_MUTATIONS = [
  { pattern: /\b(Product|ProductVariant)\.decrement\s*\(\s*['"]stockQuantity['"]/, reason: 'Direct decrement of stockQuantity on model' },
  { pattern: /\b(Product|ProductVariant)\.increment\s*\(\s*['"]stockQuantity['"]/, reason: 'Direct increment of stockQuantity on model' },
  { pattern: /\b(Product|ProductVariant)\.update\s*\(\s*\{[^}]*stockQuantity\s*:/, reason: 'Direct update of stockQuantity on model' },
  { pattern: /\bInventoryBalance\.(create|update|increment|decrement)\s*\(/, reason: 'Direct write to InventoryBalance outside canonical service' },
  { pattern: /\bInventoryLedgerEntry\.(create|update|increment|decrement)\s*\(/, reason: 'Direct write to InventoryLedgerEntry outside canonical service' },
];

function scanFile(filePath) {
  const relPath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');

  // Skip canonical files that are permitted
  if (CANONICAL_INVENTORY_EXEMPTIONS.has(relPath)) {
    return;
  }

  totalFilesChecked += 1;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    // Skip comment lines
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      return;
    }

    for (const rule of FORBIDDEN_IMPORT_PATTERNS) {
      if (rule.pattern.test(line)) {
        violations.push({
          file: relPath,
          line: idx + 1,
          code: trimmed,
          reason: rule.reason,
        });
      }
    }

    for (const rule of FORBIDDEN_DIRECT_MUTATIONS) {
      if (rule.pattern.test(line)) {
        violations.push({
          file: relPath,
          line: idx + 1,
          code: trimmed,
          reason: rule.reason,
        });
      }
    }
  });
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.mjs'))) {
      scanFile(fullPath);
    }
  }
}

for (const target of dirsToCheck) {
  const resolved = path.resolve(ROOT_DIR, target);
  if (fs.existsSync(resolved)) {
    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      walkDir(resolved);
    } else if (stat.isFile()) {
      scanFile(resolved);
    }
  }
}

if (violations.length > 0) {
  console.error('\n❌ Static Enforcement Failure: Direct stock writes detected in application modules:');
  for (const v of violations) {
    console.error(`  - ${v.file}:${v.line} [${v.reason}]`);
    console.error(`    Code: ${v.code}`);
  }
  console.error('\nDirect stock mutations in application modules are strictly forbidden.');
  console.error('All stock mutations must go through canonical inventoryLedgerService.\n');
  process.exit(1);
} else {
  console.log(`✔ Static enforcement passed: ${totalFilesChecked} files checked in [${dirsToCheck.join(', ')}]. Zero direct stock writes detected.`);
  process.exit(0);
}
