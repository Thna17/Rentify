const { readdirSync, readFileSync, statSync } = require('node:fs');
const { join } = require('node:path');
const ignored = new Set(['node_modules', '.git', 'coverage', 'dist', '.env', '.env.local']);
const findings = [];
function visit(path) {
  if (statSync(path).isDirectory()) return readdirSync(path).forEach((entry) => !ignored.has(entry) && visit(join(path, entry)));
  if (!/\.(js|jsx|ts|tsx|json|ya?ml)$/.test(path) || path.endsWith('.example') || path.replace(/\\/g, '/').endsWith('scripts/quality/secret-scan.js')) return;
  const text = readFileSync(path, 'utf8');
  if (/(?:ghp_|github_pat_|vercel_[A-Za-z0-9]|sk_live_|AKIA[0-9A-Z]{16})/.test(text)) findings.push(path);
}
visit(process.cwd());
if (findings.length) { console.error(`Potential committed secret in:\n${findings.join('\n')}`); process.exit(1); }
console.log('Secret scan passed.');
