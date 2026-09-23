import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ignored = new Set(['node_modules', '.git', 'dist', 'coverage', '.env', '.env.local']);
const findings = [];
function visit(path) {
  if (statSync(path).isDirectory()) return readdirSync(path).forEach((entry) => !ignored.has(entry) && visit(join(path, entry)));
  if (!/\.(js|jsx|ts|tsx|json|ya?ml)$/.test(path) || path.endsWith('.example') || path.endsWith('tools/secret-scan.mjs')) return;
  if (/(?:ghp_|github_pat_|vercel_[A-Za-z0-9]|sk_live_|AKIA[0-9A-Z]{16})/.test(readFileSync(path, 'utf8'))) findings.push(path);
}
visit(process.cwd());
if (findings.length) throw new Error(`Potential committed secret in:\n${findings.join('\n')}`);
console.log('Secret scan passed.');
