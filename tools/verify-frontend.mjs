import { spawnSync } from 'node:child_process';

const verificationDefaults = {
  RENTIFY_API_URL: 'https://api.rentify.invalid',
  ECOMMERCE_API_URL: 'https://commerce.rentify.invalid',
  AUTH_URL: 'https://auth.rentify.invalid',
  MERCHANT_DASHBOARD_URL: 'https://merchant.rentify.invalid',
  MARKETING_URL: 'https://www.rentify.invalid',
  MARKETPLACE_URL: 'https://market.rentify.invalid',
  ADMIN_DASHBOARD_URL: 'https://admin.rentify.invalid',
  STOREFRONT_ORIGIN: 'https://store.rentify.invalid',
  POS_URL: 'https://pos.rentify.invalid',
  VITE_RENTIFY_API_URL: 'https://api.rentify.invalid',
  VITE_ECOMMERCE_API_URL: 'https://commerce.rentify.invalid',
  VITE_AUTH_URL: 'https://auth.rentify.invalid',
  VITE_MERCHANT_DASHBOARD_URL: 'https://merchant.rentify.invalid',
  VITE_MARKETING_URL: 'https://www.rentify.invalid',
  VITE_MARKETPLACE_URL: 'https://market.rentify.invalid',
  VITE_ADMIN_DASHBOARD_URL: 'https://admin.rentify.invalid',
  VITE_STOREFRONT_ORIGIN: 'https://store.rentify.invalid',
  VITE_POS_URL: 'https://pos.rentify.invalid',
  VITE_HOSTED_STOREFRONT_DOMAIN: 'stores.rentify.invalid',
};

const env = { ...process.env };
for (const [name, value] of Object.entries(verificationDefaults)) {
  if (!env[name]) env[name] = value;
}

// Invoke npm's JavaScript entry point directly; Node 22+ cannot spawn .cmd
// scripts without a shell on Windows.
const npmCli = process.env.npm_execpath;
const command = npmCli ? process.execPath : (process.platform === 'win32' ? 'npm.cmd' : 'npm');
const args = [...(npmCli ? [npmCli] : []), '--prefix', 'rentify-frontend', 'run', 'verify'];
const result = spawnSync(command, args, {
  cwd: new URL('..', import.meta.url),
  env,
  stdio: 'inherit',
  shell: !npmCli && process.platform === 'win32',
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
