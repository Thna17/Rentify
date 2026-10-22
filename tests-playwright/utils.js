// tests-playwright/utils.js - Portable browser setup and page tracking for Playwright tests

const path = require('node:path');
const fs = require('node:fs');

function resolvePlaywright() {
  try {
    return require('playwright');
  } catch {}
  try {
    return require('@playwright/test');
  } catch {}

  const candidates = [
    path.resolve(__dirname, '../node_modules/playwright'),
    path.resolve(__dirname, '../rentify-frontend/node_modules/playwright'),
    path.resolve(__dirname, '../marketplace-frontend/node_modules/playwright'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      try {
        return require(c);
      } catch {}
    }
  }
  return null;
}

const pw = resolvePlaywright();
const chromium = pw ? pw.chromium : null;

async function createBrowser() {
  if (!chromium) {
    throw new Error(
      'Playwright chromium is not installed in this environment. To run standalone Playwright tests, run "npm install --save-dev playwright". Alternatively, use the unified test harness "node tools/e2e/runner.js" which works out-of-the-box in all environments.'
    );
  }
  const browser = await chromium.launch({
    headless: true,
  });
  return browser;
}

function setupPageTracking(page, contextName = '') {
  const errors = [];
  const networkErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`[CONSOLE_ERROR][${contextName}] ${msg.text()}`);
    }
  });

  page.on('pageerror', (err) => {
    errors.push(`[PAGE_ERROR][${contextName}] ${err.message}\n${err.stack}`);
  });

  page.on('response', (res) => {
    if (res.status() >= 400) {
      networkErrors.push({
        url: res.url(),
        status: res.status(),
        statusText: res.statusText(),
      });
    }
  });

  return { errors, networkErrors };
}

module.exports = {
  createBrowser,
  setupPageTracking,
};
