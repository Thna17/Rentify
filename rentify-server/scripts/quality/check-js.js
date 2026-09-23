const { readdirSync, statSync } = require('node:fs');
const { join } = require('node:path');
const { execFileSync } = require('node:child_process');

const ignored = new Set(['node_modules', '.git', 'coverage', 'dist']);
const files = [];
function visit(path) {
  if (!statSync(path).isDirectory()) return path.endsWith('.js') && files.push(path);
  for (const entry of readdirSync(path)) if (!ignored.has(entry)) visit(join(path, entry));
}
for (const path of process.argv.slice(2)) visit(path);
for (const file of files) execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
console.log(`Checked ${files.length} JavaScript files.`);
