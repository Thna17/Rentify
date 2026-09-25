#!/usr/bin/env node
/**
 * Storefront boundary check.
 *
 * Walks the module graph of a customer-facing storefront from its entry file,
 * following static imports, re-exports and dynamic `import()` calls, resolving
 * workspace aliases from tsconfig.base.json. Fails when the graph reaches
 * merchant dashboard, admin, staff, owner-mode or merchant payment
 * configuration code, or when the template source references merchant-only
 * API hooks directly.
 *
 * Usage: node tools/storefront-boundary.mjs [entry] (defaults to every storefront template)
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const TEMPLATE_1_ENTRY = 'apps/templates/ecommerce/ecommerce-template-1/src/main.jsx';
export const TEMPLATE_2_ENTRY = 'apps/templates/ecommerce/ecommerce-template-2/src/main.jsx';
// The single storefront app that serves every hosted store; it may load the templates.
export const STOREFRONT_SHELL_ENTRY = 'apps/storefront/src/main.jsx';
export const STOREFRONT_ENTRIES = [STOREFRONT_SHELL_ENTRY, TEMPLATE_1_ENTRY, TEMPLATE_2_ENTRY];
const SERVABLE_TEMPLATES = /^apps\/templates\/ecommerce\/ecommerce-template-[12]\//;

/** Modules a customer storefront must never load, with the reason reported. */
export const FORBIDDEN_MODULES = [
  { pattern: /^apps\/core\//, reason: 'core application code (merchant dashboard, admin, auth, marketing)' },
  { pattern: /^libs\/staff-accept\//, reason: 'staff invitation module' },
  { pattern: /^libs\/product-form\//, reason: 'merchant product administration' },
  { pattern: /^libs\/features\//, reason: 'merchant feature modules' },
  { pattern: /^libs\/apis\/src\/(index\.jsx|store\/index\.js)$/, reason: 'full platform API barrel (admin, merchant, staff endpoints)' },
  { pattern: /^libs\/utils\/src\/(index\.jsx|routes\/)/, reason: 'dashboard route configuration' },
  { pattern: /^libs\/shared\/src\/layouts\/dashboard\//, reason: 'dashboard layout' },
  {
    pattern: /^libs\/apis\/src\/store\/apis\/(staffAuthApi|staffManagementApi)\.js$/,
    reason: 'staff module',
  },
  {
    pattern: /^libs\/apis\/src\/store\/apis\/(paymentConfigApi|paymentApi|rentifyPaymentApi)\.js$/,
    reason: 'merchant payment configuration / payment administration',
  },
  {
    pattern: /^libs\/apis\/src\/store\/apis\/(adminApi|merchantApi|dashboardApi|packageApi|deploymentApi|ecommerceStatsApi|invoiceApi|websiteTemplateApi|websiteDataApi|userApi|userAuthApi|authService)\.js$/,
    reason: 'merchant, admin or platform-user API',
  },
  {
    pattern: /^libs\/storefront\/src\/(ownerSessionApi\.js|StorefrontUserMenu\.tsx|StorefrontHeaderContext\.jsx|hooks\/useStorefrontAuth\.js|routes\/storefrontRoutes\.jsx)$/,
    reason: 'store-owner / staff mode of the shared storefront',
  },
  { pattern: /^libs\/utils\/src\/hooks\/useAuth\.js$/, reason: 'merchant/staff auth hook' },
];

/** Merchant-only API hooks and URLs a template's own source must not reference. */
export const FORBIDDEN_IDENTIFIERS = [
  /\buse(Create|Update|Delete|BulkUpdate)(Product|Products|Category)\w*\b/,
  /\buseCreateBulkProducts\w*\b/,
  /\buseUpdateInventoryMutation\b/,
  /\buseUpdateWebsiteContentMutation\b/,
  /\buseUpdateThemeConfigurationMutation\b/,
  /\buseUploadImageMutation\b/,
  /\buse(CreatePOSOrder|GetPOSOrders|CreateInvoice|GetOrderHistory|ConfirmPayment)\w*\b/,
  /\bDASHBOARD_URL\b/,
];

const EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.mjs'];
const IMPORT_PATTERNS = [
  /\bimport\s+(?:[\w*{}\s,$]+?\s+from\s+)?['"]([^'"]+)['"]/g,
  /\bexport\s+(?:\*(?:\s+as\s+\w+)?|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g,
  /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
];

const stripComments = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

const loadAliases = () => {
  const tsconfig = JSON.parse(readFileSync(join(workspaceRoot, 'tsconfig.base.json'), 'utf8'));
  return Object.entries(tsconfig.compilerOptions.paths).map(([name, [target]]) => ({
    wildcard: name.endsWith('*'),
    prefix: name.replace(/\*$/, ''),
    target: target.replace(/\*$/, ''),
  }));
};

const resolveFile = (base) => {
  const candidates = [base, ...EXTENSIONS.map((ext) => base + ext), ...EXTENSIONS.map((ext) => join(base, `index${ext}`))];
  return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile()) || null;
};

const resolveSpecifier = (specifier, fromFile, aliases) => {
  if (specifier.startsWith('.')) return resolveFile(resolve(dirname(fromFile), specifier));
  // Longest alias first so `@rentify/storefront/api` wins over `@rentify/storefront`.
  const alias = aliases
    .filter((item) => (item.wildcard ? specifier.startsWith(item.prefix) : specifier === item.prefix))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];
  if (!alias) return null; // package dependency
  const rest = alias.wildcard ? specifier.slice(alias.prefix.length) : '';
  return resolveFile(join(workspaceRoot, alias.target + rest));
};

/** Every workspace file reachable from `entry`, with the importer chain for reporting. */
export const collectModuleGraph = (entry = TEMPLATE_1_ENTRY) => {
  const aliases = loadAliases();
  const start = resolve(workspaceRoot, entry);
  const parents = new Map([[start, null]]);
  const queue = [start];
  const unresolved = [];

  while (queue.length) {
    const file = queue.shift();
    if (!/\.(m?[jt]sx?)$/.test(file)) continue;
    const source = stripComments(readFileSync(file, 'utf8'));
    for (const pattern of IMPORT_PATTERNS) {
      for (const match of source.matchAll(pattern)) {
        const specifier = match[1];
        if (/\.(css|json|svg|png|jpe?g|webp)$/.test(specifier)) continue;
        const target = resolveSpecifier(specifier, file, aliases);
        if (!target) {
          if (specifier.startsWith('.') || specifier.startsWith('@rentify/')) unresolved.push({ specifier, from: file });
          continue;
        }
        if (!parents.has(target)) {
          parents.set(target, file);
          queue.push(target);
        }
      }
    }
  }

  const toRelative = (file) => relative(workspaceRoot, file).split('\\').join('/');
  const chainOf = (file) => {
    const chain = [];
    for (let current = file; current; current = parents.get(current)) chain.unshift(toRelative(current));
    return chain;
  };
  return { files: [...parents.keys()].map(toRelative), chainOf: (file) => chainOf(resolve(workspaceRoot, file)), unresolved };
};

export const findBoundaryViolations = (entry = TEMPLATE_1_ENTRY) => {
  const graph = collectModuleGraph(entry);
  const templateRoot = dirname(dirname(entry)).split('\\').join('/');

  // Templates are separate apps: a template may only load its own files. The
  // storefront shell may load the templates it serves, and nothing else in apps/.
  const isShell = templateRoot === dirname(dirname(STOREFRONT_SHELL_ENTRY));
  const otherTemplate = {
    pattern: {
      test: (file) =>
        file.startsWith('apps/templates/') && !file.startsWith(`${templateRoot}/`) && !(isShell && SERVABLE_TEMPLATES.test(file)),
    },
    reason: 'another template',
  };

  const moduleViolations = graph.files.flatMap((file) =>
    [...FORBIDDEN_MODULES, otherTemplate].filter(({ pattern }) => pattern.test(file)).map(({ reason }) => ({
      file,
      reason,
      chain: graph.chainOf(file),
    }))
  );

  const identifierViolations = graph.files
    .filter((file) => file.startsWith(`${templateRoot}/`) && !/\.(test|spec)\.[jt]sx?$/.test(file))
    .flatMap((file) => {
      const source = stripComments(readFileSync(join(workspaceRoot, file), 'utf8'));
      return FORBIDDEN_IDENTIFIERS.filter((pattern) => pattern.test(source)).map((pattern) => ({
        file,
        reason: `references merchant-only identifier ${source.match(pattern)[0]}`,
        chain: [file],
      }));
    });

  return { graph, violations: [...moduleViolations, ...identifierViolations] };
};

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const entries = process.argv[2] ? [process.argv[2]] : STOREFRONT_ENTRIES;
  let failed = false;
  for (const entry of entries) {
    const { graph, violations } = findBoundaryViolations(entry);
    if (graph.unresolved.length) {
      failed = true;
      console.error(`Unresolved workspace imports for ${entry}:`);
      for (const { specifier, from } of graph.unresolved) console.error(`  ${specifier} (from ${relative(workspaceRoot, from)})`);
    }
    if (violations.length) {
      failed = true;
      console.error(`Storefront boundary violations for ${entry}:`);
      for (const violation of violations) console.error(`  ✗ ${violation.file}: ${violation.reason}\n      via ${violation.chain.join(' → ')}`);
      continue;
    }
    console.log(`✓ ${entry}: ${graph.files.length} workspace modules checked, no merchant/admin/staff/payment-config imports.`);
  }
  if (failed) process.exit(1);
}
