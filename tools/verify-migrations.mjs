import { readdirSync, readFileSync } from 'node:fs';

const locations = [
  ['Core API', 'rentify-server/src/migrations'],
  ['Commerce API', 'ecommerce-server/migrations'],
];

const errors = [];
for (const [service, directory] of locations) {
  const files = readdirSync(directory)
    .filter((file) => /^\d+_.+\.js$/.test(file))
    .sort();
  const prefixes = new Set();

  for (const file of files) {
    const prefixMatch = file.match(/^(\d+_\d+)_/);
    const prefix = prefixMatch?.[1] || file.replace(/\.js$/, '');
    if (prefixes.has(prefix)) errors.push(`${service}: duplicate migration prefix ${prefix}`);
    prefixes.add(prefix);

    const source = readFileSync(`${directory}/${file}`, 'utf8');
    if (!/exports\.up\s*=\s*async/.test(source)) {
      errors.push(`${service}: ${file} does not export an async up migration`);
    }
    if (/sync\s*\(\s*\{[^}]*\b(?:alter|force)\s*:\s*true/s.test(source)) {
      errors.push(`${service}: ${file} uses destructive/model-driven sync`);
    }
  }

  console.log(`${service}: ${files.length} ordered migration files checked.`);
}

if (errors.length) {
  console.error('Migration policy verification failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Migration policy verification passed.');
