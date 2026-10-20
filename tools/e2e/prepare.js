// tools/e2e/prepare.js - Clean-CI preparation for E2E and contract test suite

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT_DIR } = require('./config');
const { assertSafeE2EEnvironment } = require('./safety');
const { ensureDatabasesAndMigrations } = require('./dbHelper');

async function prepare() {
  console.log('=================================================================');
  console.log('📦 Rentify E2E Environment Preparation');
  console.log('=================================================================');

  // 1. Safety environment gate
  assertSafeE2EEnvironment();
  console.log('✅ Safety environment check passed.');

  // 2. Ensure Playwright Chromium browser binary is installed
  console.log('🌐 Ensuring Playwright Chromium is installed...');
  execFileSync('npx', ['playwright', 'install', 'chromium'], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    env: process.env,
  });
  console.log('✅ Playwright Chromium ready.');

  // 3. Build Marketplace frontend (Angular)
  console.log('🔨 Building Marketplace frontend (Angular)...');
  execFileSync('npm', ['--prefix', 'marketplace-frontend', 'run', 'build'], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    env: process.env,
  });
  console.log('✅ Marketplace frontend built.');

  // 4. Build Merchant frontend (React/Vite) with local test origins enabled
  console.log('🔨 Building Merchant frontend (React/Vite)...');
  const merchantBuildEnv = {
    ...process.env,
    VITE_ALLOW_LOCALHOST_LINKS: 'true',
    VITE_RENTIFY_API_URL: 'http://127.0.0.1:4499',
    VITE_ECOMMERCE_API_URL: 'http://127.0.0.1:4199',
    VITE_AUTH_URL: 'http://127.0.0.1:4499',
    VITE_MERCHANT_DASHBOARD_URL: 'http://127.0.0.1:4499',
    VITE_MARKETING_URL: 'http://127.0.0.1:4599',
    VITE_MARKETPLACE_URL: 'http://127.0.0.1:4599',
    VITE_ADMIN_DASHBOARD_URL: 'http://127.0.0.1:4499',
    VITE_POS_URL: 'http://127.0.0.1:4401',
    VITE_STOREFRONT_ORIGIN: 'http://127.0.0.1:4599',
  };
  execFileSync('npm', ['--prefix', 'rentify-frontend', 'run', 'build:merchant'], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    env: merchantBuildEnv,
  });
  console.log('✅ Merchant frontend built.');

  // 5. Ensure isolated test databases exist and apply database migrations
  console.log('🗄️ Ensuring isolated test databases and applying migrations...');
  await ensureDatabasesAndMigrations();
  console.log('✅ Core and Commerce test databases created and migrations applied.');

  console.log('=================================================================');
  console.log('🎉 Rentify E2E Environment Preparation Complete!');
  console.log('=================================================================');
}

if (require.main === module) {
  prepare().catch((err) => {
    console.error('❌ E2E preparation failed:', err);
    process.exit(1);
  });
}

module.exports = { prepare };
