// tools/e2e/browserShell.js - Real Playwright browser automation shell with observable state waiting, network tracing, and native screenshot capture

const fs = require('node:fs');
const path = require('node:path');
const { requireModule } = require('./resolve');
const pw = requireModule('playwright');
const { ROOT_DIR, TIMEOUTS } = require('./config');
const { assertSafeUrl } = require('./safety');

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
  return undefined;
}

class BrowserSession {
  /**
   * @param {object} [options]
   * @param {import('./artifactCollector').ArtifactCollector} [options.artifactCollector]
   * @param {'chromium' | 'webkit'} [options.browserType]
   * @param {object} [options.viewport]
   * @param {string} [options.device]
   * @param {boolean} [options.isMobile]
   * @param {boolean} [options.hasTouch]
   * @param {string} [options.userAgent]
   */
  constructor(options = {}) {
    this.collector = options.artifactCollector || null;
    this.currentUrl = null;
    this.browser = null;
    this.context = null;
    this.page = null;
    this.browserType = options.browserType || 'chromium';
    this.viewport = options.viewport || { width: 1280, height: 720 };
    this.device = options.device || null;
    this.isMobile = options.isMobile;
    this.hasTouch = options.hasTouch;
    this.userAgent = options.userAgent;
    this.chromeBin = findChromeBinary();
    this.isInitialized = false;
  }

  async init(journeyName = 'journey') {
    if (this.isInitialized) return;

    const engine = this.browserType === 'webkit' ? pw.webkit : pw.chromium;
    const launchOptions = {
      headless: true,
      args: this.browserType === 'chromium' ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] : [],
    };
    if (this.browserType === 'chromium' && this.chromeBin) {
      launchOptions.executablePath = this.chromeBin;
    }

    this.browser = await engine.launch(launchOptions);

    let contextOptions = {
      viewport: this.viewport,
      ignoreHTTPSErrors: true,
    };

    if (this.device && pw.devices[this.device]) {
      contextOptions = {
        ...contextOptions,
        ...pw.devices[this.device],
      };
    }
    if (this.viewport) contextOptions.viewport = this.viewport;
    if (this.isMobile !== undefined) contextOptions.isMobile = this.isMobile;
    if (this.hasTouch !== undefined) contextOptions.hasTouch = this.hasTouch;
    if (this.userAgent) contextOptions.userAgent = this.userAgent;

    this.context = await this.browser.newContext(contextOptions);

    // Start native Playwright tracing
    await this.context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    this.isTracing = true;

    this.page = await this.context.newPage();

    // Hook console logs
    this.page.on('console', (msg) => {
      if (this.collector) {
        this.collector.recordConsole({ level: msg.type(), text: msg.text() });
      }
    });

    // Hook failed network requests
    this.page.on('requestfailed', (req) => {
      if (this.collector) {
        this.collector.recordNetwork({
          method: req.method(),
          url: req.url(),
          failed: true,
          error: req.failure()?.errorText,
        });
      }
    });

    // Hook responses
    this.page.on('response', (res) => {
      if (this.collector) {
        this.collector.recordNetwork({
          method: res.request().method(),
          url: res.url(),
          status: res.status(),
        });
      }
    });

    this.isInitialized = true;
  }

  async goto(url, options = {}) {
    assertSafeUrl(url);
    if (!this.isInitialized) await this.init();
    this.currentUrl = url;

    const res = await this.page.goto(url, {
      waitUntil: options.waitUntil || 'domcontentloaded',
      timeout: options.timeout || TIMEOUTS.navigation,
    });

    return {
      ok: res ? res.ok() : true,
      status: res ? res.status() : 200,
      url: this.page.url(),
    };
  }

  async title() {
    if (!this.isInitialized) await this.init();
    return this.page.title();
  }

  async waitForSelector(selector, options = {}) {
    if (!this.isInitialized) await this.init();
    return this.page.waitForSelector(selector, {
      state: options.state || 'visible',
      timeout: options.timeout || TIMEOUTS.selector,
    });
  }

  async click(selector, options = {}) {
    if (!this.isInitialized) await this.init();
    await this.page.click(selector, options);
  }

  async fill(selector, text, options = {}) {
    if (!this.isInitialized) await this.init();
    await this.page.fill(selector, text, options);
  }

  async textContent(selector, options = {}) {
    if (!this.isInitialized) await this.init();
    return this.page.textContent(selector, options);
  }

  async evaluate(fn, arg) {
    if (!this.isInitialized) await this.init();
    return this.page.evaluate(fn, arg);
  }

  async addCookies(cookies) {
    if (!this.isInitialized) await this.init();
    await this.context.addCookies(cookies);
  }

  async clearCookies() {
    if (this.context) {
      await this.context.clearCookies();
    }
  }

  async cookies(urls) {
    if (!this.context) return [];
    return this.context.cookies(urls);
  }

  async getCookie(name, url) {
    const all = await this.cookies(url ? [url] : undefined);
    return all.find((c) => c.name === name) || null;
  }

  async screenshot(name) {
    if (!this.isInitialized) await this.init();
    const filePath = this.collector
      ? this.collector.getScreenshotPath(name)
      : path.join(ROOT_DIR, `artifacts/${name}.png`);
    await this.page.screenshot({ path: filePath, fullPage: true });
    return filePath;
  }

  async saveTrace(testName) {
    if (this.context && this.isTracing) {
      this.isTracing = false;
      const tracePath = this.collector
        ? this.collector.getTracePath(testName)
        : path.join(ROOT_DIR, `artifacts/${testName}-trace.zip`);
      await this.context.tracing.stop({ path: tracePath });
      return tracePath;
    }
    return null;
  }

  async close(testName = null) {
    try {
      if (this.context) {
        if (testName && this.isTracing) {
          await this.saveTrace(testName);
        } else if (this.isTracing) {
          this.isTracing = false;
          await this.context.tracing.stop().catch(() => {});
        }
        await this.context.close().catch(() => {});
      }
      if (this.browser) {
        await this.browser.close().catch(() => {});
      }
    } catch (_err) {
      // Ignore closing errors
    } finally {
      this.isInitialized = false;
      this.isTracing = false;
      this.page = null;
      this.context = null;
      this.browser = null;
    }
  }
}

module.exports = {
  BrowserSession,
  findChromeBinary,
};
