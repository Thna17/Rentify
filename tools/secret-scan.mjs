import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const tracked = execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

const allowedEnvironmentExamples = (file) =>
  /(^|\/)\.env(?:\.[^/]+)?\.example$/.test(file) || file === '.env.docker.example';

const forbiddenTrackedName = (file) => {
  const base = path.basename(file);
  if (allowedEnvironmentExamples(file)) return false;
  if (base === '.env' || base.startsWith('.env.')) return true;
  if (base === 'secrets.env' || base === 'credentials.json' || base === 'dump.rdb') return true;
  return /\.(?:pem|key|p12|pfx|sqlite|sqlite3|db)$/i.test(base);
};

const contentRules = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ['GitHub token', /\bgh[opusr]_[A-Za-z0-9_]{20,}\b/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['Vercel token', /\bvercel_[A-Za-z0-9_-]{20,}\b/],
];

const errors = [];
for (const file of tracked) {
  if (forbiddenTrackedName(file)) {
    errors.push(`${file}: runtime secret or local-data filename is tracked`);
    continue;
  }

  let stat;
  try {
    stat = statSync(file);
  } catch {
    continue;
  }
  if (!stat.isFile() || stat.size > 2_000_000 || /(?:package-lock\.json|\.(?:png|jpe?g|gif|webp|ico|woff2?|pdf))$/i.test(file)) {
    continue;
  }

  const content = readFileSync(file);
  if (content.includes(0)) continue;
  const text = content.toString('utf8');
  for (const [label, pattern] of contentRules) {
    if (pattern.test(text)) errors.push(`${file}: possible ${label}`);
  }
}

if (errors.length) {
  console.error('Repository secret scan failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Repository secret scan passed (${tracked.length} tracked and untracked source files checked).`);
