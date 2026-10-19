// tools/e2e/browserShell.js - CI-capable browser automation shell with observable state waiting, network tracing, and screenshot capture

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ROOT_DIR, TIMEOUTS } = require('./config');
const { assertSafeUrl } = require('./safety');

// Locate JSDOM from frontend dependencies
function getJSDOM() {
  const candidates = [
    path.join(ROOT_DIR, 'marketplace-frontend/node_modules/jsdom'),
    path.join(ROOT_DIR, 'rentify-frontend/node_modules/jsdom'),
    path.join(ROOT_DIR, 'admin-frontend/node_modules/jsdom'),
    path.join(ROOT_DIR, 'node_modules/jsdom'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return require(c).JSDOM;
    }
  }
  return null;
}

// Locate Chrome/Chromium binary for native headless screenshot rendering
function findChromeBinary() {
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

class BrowserSession {
  /**
   * @param {object} [options]
   * @param {import('./artifactCollector').ArtifactCollector} [options.artifactCollector]
   */
  constructor(options = {}) {
    this.collector = options.artifactCollector || null;
    this.currentUrl = null;
    this.dom = null;
    this.document = null;
    this.window = null;
    this.cookies = new Map();
    this.JSDOM = getJSDOM();
    this.chromeBin = findChromeBinary();
  }

  /**
   * Navigates to a target URL, enforcing safety checks and intercepting network traffic.
   *
   * @param {string} url
   * @param {object} [options]
   */
  async goto(url, options = {}) {
    assertSafeUrl(url);
    this.currentUrl = url;
    const startTime = Date.now();

    const headers = {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'Rentify-E2E-Runner/1.0 (Headless)',
      ...(options.headers || {}),
    };

    if (this.cookies.size > 0) {
      headers.Cookie = Array.from(this.cookies.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
    }

    try {
      const res = await fetch(url, { headers, redirect: 'follow' });
      const duration = Date.now() - startTime;
      const html = await res.text();

      // Store cookies if any
      const setCookie = res.headers.get('set-cookie');
      if (setCookie) {
        const parts = setCookie.split(';')[0].split('=');
        if (parts.length === 2) this.cookies.set(parts[0].trim(), parts[1].trim());
      }

      if (this.collector) {
        this.collector.recordNetwork({
          method: 'GET',
          url,
          status: res.status,
          durationMs: duration,
        });
      }

      if (this.JSDOM) {
        this.dom = new this.JSDOM(html, {
          url,
          runScripts: 'outside-only',
          resources: 'usable',
        });
        this.window = this.dom.window;
        this.document = this.window.document;
      }

      return { status: res.status, ok: res.ok, html };
    } catch (err) {
      if (this.collector) {
        this.collector.recordNetwork({
          method: 'GET',
          url,
          status: 0,
          error: err.message,
          durationMs: Date.now() - startTime,
        });
      }
      throw err;
    }
  }

  /**
   * Title of current document.
   */
  async title() {
    return this.document?.title || '';
  }

  /**
   * Waits for a selector to become present in the DOM (observable state check, not arbitrary sleep).
   *
   * @param {string} selector
   * @param {object} [options]
   * @param {number} [options.timeout]
   * @returns {Promise<Element>}
   */
  async waitForSelector(selector, options = {}) {
    const timeout = options.timeout || TIMEOUTS.selector;
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const el = this.document?.querySelector(selector);
      if (el) return el;
      await new Promise((r) => setTimeout(r, TIMEOUTS.pollInterval));
    }

    throw new Error(`Timed out waiting for selector "${selector}" after ${timeout}ms. URL: ${this.currentUrl}`);
  }

  /**
   * Waits for text content within an element to match expected substring.
   *
   * @param {string} selector
   * @param {string|RegExp} expectedText
   * @param {object} [options]
   */
  async waitForText(selector, expectedText, options = {}) {
    const timeout = options.timeout || TIMEOUTS.selector;
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const el = this.document?.querySelector(selector);
      if (el) {
        const text = el.textContent || '';
        const matches =
          expectedText instanceof RegExp ? expectedText.test(text) : text.includes(expectedText);
        if (matches) return el;
      }
      await new Promise((r) => setTimeout(r, TIMEOUTS.pollInterval));
    }

    throw new Error(
      `Timed out waiting for text "${expectedText}" in selector "${selector}" after ${timeout}ms. Current text: "${this.document?.querySelector(selector)?.textContent}"`
    );
  }

  /**
   * Returns textContent of an element.
   *
   * @param {string} selector
   */
  async textContent(selector) {
    const el = await this.waitForSelector(selector);
    return el.textContent?.trim() || '';
  }

  /**
   * Returns attribute value of an element.
   *
   * @param {string} selector
   * @param {string} attr
   */
  async getAttribute(selector, attr) {
    const el = await this.waitForSelector(selector);
    return el.getAttribute(attr);
  }

  /**
   * Fills a form input field.
   *
   * @param {string} selector
   * @param {string} value
   */
  async fill(selector, value) {
    const el = await this.waitForSelector(selector);
    el.value = value;
    const event = new this.window.Event('input', { bubbles: true });
    el.dispatchEvent(event);
    const changeEvent = new this.window.Event('change', { bubbles: true });
    el.dispatchEvent(changeEvent);
    return true;
  }

  /**
   * Clicks an element.
   *
   * @param {string} selector
   */
  async click(selector) {
    const el = await this.waitForSelector(selector);
    const clickEvent = new this.window.MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: this.window,
    });
    el.dispatchEvent(clickEvent);
    return true;
  }

  /**
   * Captures a failure or progress screenshot.
   * Uses Chrome headless when available; produces deterministic high-contrast snapshot otherwise.
   *
   * @param {object} [options]
   * @param {string} [options.name]
   * @param {string} [options.path]
   * @returns {string} Path to saved screenshot
   */
  async screenshot(options = {}) {
    const name = options.name || 'screenshot';
    let screenshotBuffer = null;

    if (this.chromeBin && this.currentUrl) {
      try {
        const tempPath = path.join(ROOT_DIR, `temp-${Date.now()}.png`);
        execFileSync(this.chromeBin, [
          '--headless',
          '--disable-gpu',
          '--no-sandbox',
          `--screenshot=${tempPath}`,
          `--window-size=1280,800`,
          this.currentUrl,
        ], { timeout: 8000 });

        if (fs.existsSync(tempPath)) {
          screenshotBuffer = fs.readFileSync(tempPath);
          fs.unlinkSync(tempPath);
        }
      } catch (err) {
        if (this.collector) this.collector.recordConsole({ text: `Chrome screenshot fallback: ${err.message}`, level: 'warn' });
      }
    }

    // High-contrast SVG/PNG fallback if Chrome was unavailable
    if (!screenshotBuffer) {
      const pageTitle = this.document?.title || 'Rentify Page';
      const bodySnippet = (this.document?.body?.textContent || '').slice(0, 300).replace(/</g, '&lt;');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
        <rect width="1280" height="800" fill="#0f172a"/>
        <rect x="40" y="40" width="1200" height="720" rx="8" fill="#1e293b" stroke="#334155" stroke-width="2"/>
        <text x="80" y="100" font-family="system-ui, sans-serif" font-size="28" fill="#f8fafc" font-weight="bold">${pageTitle}</text>
        <text x="80" y="140" font-family="monospace" font-size="16" fill="#94a3b8">URL: ${this.currentUrl || 'none'}</text>
        <line x1="80" y1="170" x2="1160" y2="170" stroke="#475569" stroke-width="1"/>
        <text x="80" y="210" font-family="system-ui, sans-serif" font-size="16" fill="#e2e8f0">Rendered DOM Summary:</text>
        <foreignObject x="80" y="230" width="1080" height="480">
          <div xmlns="http://www.w3.org/1999/xhtml" style="color: #cbd5e1; font-family: monospace; font-size: 14px; white-space: pre-wrap; line-height: 1.5;">
            ${bodySnippet}
          </div>
        </foreignObject>
      </svg>`;
      screenshotBuffer = Buffer.from(svg, 'utf8');
    }

    if (this.collector) {
      return this.collector.saveScreenshot(name, screenshotBuffer);
    }
    return '';
  }

  /**
   * Closes browser session and releases resources.
   */
  async close() {
    if (this.window) {
      this.window.close();
      this.window = null;
      this.document = null;
      this.dom = null;
    }
  }
}

module.exports = {
  BrowserSession,
};
