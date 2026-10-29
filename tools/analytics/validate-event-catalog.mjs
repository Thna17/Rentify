import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const catalogPath = path.join(root, 'docs/analytics/event-catalog.json');

export const validateCatalog = (catalog) => {
  const errors = [];
  if (!/^\d+\.\d+\.\d+$/.test(catalog?.catalogVersion || '')) errors.push('catalogVersion must be semantic');
  if (!Array.isArray(catalog?.events) || catalog.events.length === 0) errors.push('events must be non-empty');
  const names = new Set();
  const forbidden = new Set(catalog?.privacy?.prohibitedProperties || []);
  for (const event of catalog?.events || []) {
    const key = `${event.name}@${event.schemaVersion}`;
    if (names.has(key)) errors.push(`duplicate event contract: ${key}`);
    names.add(key);
    if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(event.name || '')) errors.push(`invalid event name: ${event.name}`);
    if (!/^\d+\.\d+\.\d+$/.test(event.schemaVersion || '')) errors.push(`invalid schema version: ${key}`);
    if (!['core', 'commerce'].includes(event.owner)) errors.push(`invalid owner: ${key}`);
    if (!['browser', 'authoritative'].includes(event.source)) errors.push(`invalid source: ${key}`);
    const required = new Set(event.requiredProperties || []);
    const allowed = new Set(event.allowedProperties || []);
    for (const property of required) if (!allowed.has(property)) errors.push(`${key} requires non-allowed property ${property}`);
    for (const property of [...allowed, ...(event.allowedMeasures || [])]) {
      if (forbidden.has(property)) errors.push(`${key} allows prohibited property ${property}`);
    }
  }
  return errors;
};

export const loadCatalog = () => JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const catalog = loadCatalog();
  const errors = validateCatalog(catalog);
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log(`Analytics event catalog ${catalog.catalogVersion} passed (${catalog.events.length} events).`);
  }
}
