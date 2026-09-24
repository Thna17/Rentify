import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const websiteStatus = Object.freeze({
  customization: 'inactive', pending: 'inactive', building: 'inactive',
  active: 'active', failed: 'inactive', suspended: 'suspended',
  expired: 'inactive', archived: 'inactive', deleted: 'inactive',
});
const storeFields = ['ownerUserId', 'primaryCategory', 'needsCategoryReview',
  'marketplaceEnabled', 'marketplaceApprovalStatus', 'status', 'marketplaceEntitlement'];

export function compareSnapshots(core, commerce) {
  if (core.schemaVersion !== 1 || core.source !== 'core' ||
      commerce.schemaVersion !== 1 || commerce.source !== 'commerce') {
    throw new Error('Incompatible Core or Commerce projection snapshot');
  }
  const findings = [];
  const problem = (type, id, details) => findings.push({ type, id, details });
  const coreStores = new Map(core.stores.map((row) => [row.id, row]));
  const commerceStores = new Map(commerce.stores.map((row) => [row.storeId, row]));
  const coreWebsites = new Map(core.websites.map((row) => [row.id, row]));
  const commerceWebsites = new Map(commerce.websites.map((row) => [row.websiteId, row]));
  for (const [name, rows, mapped] of [
    ['Core Store', core.stores, coreStores], ['Commerce Store', commerce.stores, commerceStores],
    ['Core Website', core.websites, coreWebsites], ['Commerce Website', commerce.websites, commerceWebsites],
  ]) if (rows.length !== mapped.size) problem('duplicate_id', name, 'Snapshot contains duplicate IDs');
  for (const id of core.pendingStoreIds || []) problem('pending_store_sync', id, 'Core Store projection is queued');
  for (const id of core.pendingWebsiteIds || []) problem('pending_website_sync', id, 'Core Website projection is queued');

  for (const [id, store] of coreStores) {
    const projected = commerceStores.get(id);
    if (!projected) { problem('missing_commerce_store', id, 'Core Store has no Commerce projection'); continue; }
    for (const field of storeFields) {
      const source = ['needsCategoryReview', 'marketplaceEnabled'].includes(field)
        ? Boolean(store[field]) : store[field] ?? null;
      const target = ['needsCategoryReview', 'marketplaceEnabled'].includes(field)
        ? Boolean(projected[field]) : projected[field] ?? null;
      if (source !== target) problem('store_field_mismatch', id, field);
    }
    if (Number(store.projectionVersion) !== Number(projected.version)) {
      problem('store_version_mismatch', id, `${store.projectionVersion} != ${projected.version}`);
    }
    const linked = core.websites.filter((website) => website.storeId === id);
    if (linked.length > 1) problem('multiple_websites', id, `${linked.length} Websites`);
    if ((linked[0]?.id || null) !== (projected.websiteId || null)) {
      problem('store_website_mismatch', id, 'Core and Commerce Website links differ');
    }
    if (store.status === 'active' && store.marketplaceApprovalStatus === 'approved' &&
        (store.needsCategoryReview || !store.primaryCategory)) {
      problem('approved_store_category_unreviewed', id, 'Approved seller has no reviewed primary category');
    }
  }
  for (const id of commerceStores.keys()) {
    if (!coreStores.has(id)) problem('orphan_commerce_store', id, 'No Core Store exists');
  }
  for (const [id, website] of coreWebsites) {
    if (!website.storeId || !coreStores.has(website.storeId)) {
      problem('unmapped_core_website', id, 'Website has no valid Core Store');
    } else if (coreStores.get(website.storeId).ownerUserId !== website.userId) {
      problem('website_owner_mismatch', id, 'Website owner differs from Store owner');
    }
    const projected = commerceWebsites.get(id);
    if (!projected) { problem('missing_commerce_website', id, 'Core Website has no Commerce projection'); continue; }
    for (const field of ['storeId', 'userId', 'domain']) {
      if ((website[field] || null) !== (projected[field] || null)) {
        problem('website_field_mismatch', id, field);
      }
    }
    if (websiteStatus[website.status] !== projected.status) {
      problem('website_status_mismatch', id, `${website.status} != ${projected.status}`);
    }
  }
  for (const id of commerceWebsites.keys()) {
    if (!coreWebsites.has(id)) problem('orphan_commerce_website', id, 'No Core Website exists');
  }
  return { projectionReady: findings.length === 0,
    coreDatabase: core.database, commerceDatabase: commerce.database,
    sampledAt: { core: core.generatedAt, commerce: commerce.generatedAt },
    counts: { coreStores: core.stores.length, commerceStores: commerce.stores.length,
      coreWebsites: core.websites.length, commerceWebsites: commerce.websites.length,
      pendingStoreSync: core.pendingStoreIds?.length || 0,
      pendingWebsiteSync: core.pendingWebsiteIds?.length || 0 }, findings };
}

function dockerSnapshot(service) {
  const result = spawnSync('docker', ['compose', 'exec', '-T', service,
    'npm', 'run', 'db:export-cutover-projection'], {
    cwd: repoRoot, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${service} snapshot failed: ${result.stderr || result.stdout}`);
  const marker = result.stdout.split(/\r?\n/).find((line) => line.startsWith('CUTOVER_SNAPSHOT_JSON='));
  if (!marker) throw new Error(`${service} did not return a projection snapshot`);
  return JSON.parse(marker.slice('CUTOVER_SNAPSHOT_JSON='.length));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [corePath, commercePath] = process.argv.slice(2);
    if (Boolean(corePath) !== Boolean(commercePath)) {
      throw new Error('Pass both Core and Commerce JSON snapshot files, or neither to use local Docker Compose');
    }
    const core = corePath ? JSON.parse(readFileSync(corePath, 'utf8')) : dockerSnapshot('core-api');
    const commerce = commercePath ? JSON.parse(readFileSync(commercePath, 'utf8')) : dockerSnapshot('ecommerce-api');
    const report = compareSnapshots(core, commerce);
    console.log(JSON.stringify(report, null, 2));
    if (!report.projectionReady) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
