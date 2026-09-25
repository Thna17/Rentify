import { execFileSync } from 'node:child_process';

const output = execFileSync(
  'git',
  ['status', '--porcelain=v1', '-z', '--untracked-files=all'],
  { encoding: 'utf8' },
);

const entries = output.split('\0').filter(Boolean).map((record) => ({
  status: record.slice(0, 2),
  path: record.slice(3),
}));

const generatedPattern = /(^|\/)(?:node_modules|dist|coverage|\.nx|\.angular|output)(\/|$)|(?:\.log|\.pid|\.sqlite3?|\.db|dump\.rdb)$/;
const secretPattern = /(^|\/)(?:\.env(?:\..+)?|secrets\.env|credentials\.json)$/;

const classify = (file) => {
  if (generatedPattern.test(file)) return 'Generated/runtime';
  if (secretPattern.test(file) && !file.endsWith('.example')) return 'Sensitive/local-only';
  if (file.startsWith('rentify-server/')) return 'Core API';
  if (file.startsWith('ecommerce-server/')) return 'Commerce API';
  if (file.startsWith('rentify-frontend/')) return 'React frontend';
  if (file.startsWith('marketplace-frontend/')) return 'Marketplace';
  if (file.startsWith('admin-frontend/')) return 'Admin';
  if (/^(?:deploy\/|compose(?:\.|$)|DOCKER\.md$|docker\/)/.test(file)) return 'Deployment';
  if (/^(?:docs\/|README\.md$|AGENTS\.md$)/.test(file)) return 'Documentation';
  return 'Repository governance';
};

const groups = new Map();
for (const entry of entries) {
  const category = classify(entry.path);
  if (!groups.has(category)) groups.set(category, []);
  groups.get(category).push(entry);
}

console.log(`# Worktree inventory (${entries.length} paths)\n`);
for (const category of [...groups.keys()].sort()) {
  const files = groups.get(category);
  console.log(`## ${category} (${files.length})`);
  for (const file of files) console.log(`${file.status}\t${file.path}`);
  console.log('');
}
