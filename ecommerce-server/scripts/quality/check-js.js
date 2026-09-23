const { readdirSync, statSync } = require('node:fs');
const { join } = require('node:path');
const { execFileSync } = require('node:child_process');
const ignored = new Set(['node_modules', '.git', 'coverage', 'dist', 'migrations']);
const files = [];
function visit(path) { if (!statSync(path).isDirectory()) return path.endsWith('.js') && files.push(path); for (const entry of readdirSync(path)) if (!ignored.has(entry)) visit(join(path, entry)); }
const paths = [];
const argumentsList = process.argv.slice(2);
for (let index = 0; index < argumentsList.length; index += 1) {
  const value = argumentsList[index];
  if (value === '--ignore') {
    index += 1;
    continue;
  }
  if (!value.startsWith('--')) paths.push(value);
}
for (const path of paths) visit(path);
for (const file of files) execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
console.log(`Checked ${files.length} JavaScript files.`);
