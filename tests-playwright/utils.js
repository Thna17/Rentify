const { chromium } = require('C:/Users/User/node_modules/playwright');

async function createBrowser() {
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
      // Ignore normal expected 401s or 404s if handled, but track them
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
