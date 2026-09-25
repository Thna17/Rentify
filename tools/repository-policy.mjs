import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const required = [
  '.github/CODEOWNERS',
  '.github/workflows/quality.yml',
  'CONTRIBUTING.md',
  'OWNERSHIP.md',
  'package.json',
  'rentify-server/package-lock.json',
  'ecommerce-server/package-lock.json',
  'rentify-frontend/package-lock.json',
  'marketplace-frontend/package-lock.json',
  'admin-frontend/package-lock.json',
];

const errors = required.filter((file) => !existsSync(file)).map((file) => `${file} is missing`);
const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const generated = tracked.filter((file) =>
  /(^|\/)(?:node_modules|dist|coverage|\.nx|\.angular|output)(\/|$)/.test(file),
);
for (const file of generated) errors.push(`${file}: generated output is tracked`);

if (errors.length) {
  console.error('Repository policy verification failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Repository policy verification passed.');
