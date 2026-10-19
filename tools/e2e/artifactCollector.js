// tools/e2e/artifactCollector.js - Captures screenshots, traces, and service logs on test runs and failures

const fs = require('node:fs');
const path = require('node:path');
const { ROOT_DIR } = require('./config');

class ArtifactCollector {
  /**
   * @param {object} [options]
   * @param {string} [options.runId] - Unique ID for the test run
   * @param {string} [options.baseDir] - Base directory for artifacts
   */
  constructor(options = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.runId = options.runId || `run-${timestamp}`;
    this.baseDir = options.baseDir || path.join(ROOT_DIR, 'artifacts/e2e', this.runId);
    this.latestDir = path.join(ROOT_DIR, 'artifacts/e2e/latest');

    this.screenshotsDir = path.join(this.baseDir, 'screenshots');
    this.tracesDir = path.join(this.baseDir, 'traces');
    this.logsDir = path.join(this.baseDir, 'logs');

    this.artifacts = [];
    this.networkEntries = [];
    this.consoleLogs = [];
    this.serviceLogs = [];

    this._ensureDirs();
  }

  _ensureDirs() {
    for (const dir of [this.baseDir, this.screenshotsDir, this.tracesDir, this.logsDir]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  recordNetwork(entry) {
    this.networkEntries.push({
      timestamp: new Date().toISOString(),
      ...entry,
    });
  }

  recordConsole(msg) {
    this.consoleLogs.push({
      timestamp: new Date().toISOString(),
      ...(typeof msg === 'string' ? { text: msg, level: 'log' } : msg),
    });
  }

  recordServiceLog(serviceName, line) {
    this.serviceLogs.push({
      timestamp: new Date().toISOString(),
      service: serviceName,
      message: line,
    });
  }

  /**
   * Saves a PNG screenshot or SVG/HTML snapshot.
   *
   * @param {string} name - Screenshot file name
   * @param {Buffer|string} data - Binary PNG data or SVG/HTML string
   * @returns {string} Absolute path to screenshot
   */
  saveScreenshot(name, data) {
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const ext = typeof data === 'string' && data.startsWith('<svg') ? '.svg' : '.png';
    const filePath = path.join(this.screenshotsDir, `${safeName}${ext}`);
    fs.writeFileSync(filePath, data);
    this.artifacts.push({ type: 'screenshot', name, path: filePath });
    return filePath;
  }

  /**
   * Saves a structured trace for a test failure or journey.
   *
   * @param {string} testName
   * @param {object} context
   * @returns {string} Absolute path to trace file
   */
  saveTrace(testName, context = {}) {
    const safeName = testName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = path.join(this.tracesDir, `${safeName}-trace.json`);
    const traceData = {
      testName,
      timestamp: new Date().toISOString(),
      runId: this.runId,
      context,
      networkEntries: this.networkEntries,
      consoleLogs: this.consoleLogs,
      serviceLogs: this.serviceLogs,
    };
    fs.writeFileSync(filePath, JSON.stringify(traceData, null, 2), 'utf8');
    this.artifacts.push({ type: 'trace', name: testName, path: filePath });
    return filePath;
  }

  /**
   * Writes all collected service logs to disk.
   */
  flushLogs() {
    const logFilePath = path.join(this.logsDir, 'services.log');
    const content = this.serviceLogs
      .map((e) => `[${e.timestamp}] [${e.service}] ${e.message}`)
      .join('\n');
    fs.writeFileSync(logFilePath, content, 'utf8');
    this.artifacts.push({ type: 'log', name: 'services', path: logFilePath });
  }

  /**
   * Writes the final summary report and updates latest pointer.
   *
   * @param {object} summaryData
   * @returns {string} Path to summary.json
   */
  writeSummary(summaryData = {}) {
    this.flushLogs();
    const summaryPath = path.join(this.baseDir, 'summary.json');
    const payload = {
      runId: this.runId,
      generatedAt: new Date().toISOString(),
      artifactsCount: this.artifacts.length,
      artifacts: this.artifacts,
      ...summaryData,
    };
    fs.writeFileSync(summaryPath, JSON.stringify(payload, null, 2), 'utf8');

    // Update 'latest' pointer
    try {
      if (fs.existsSync(this.latestDir)) {
        try {
          fs.unlinkSync(this.latestDir);
        } catch {
          fs.rmSync(this.latestDir, { recursive: true, force: true });
        }
      }
      fs.symlinkSync(this.baseDir, this.latestDir, 'dir');
    } catch {
      // If symlink fails (e.g. on Windows without permissions), copy summary
      try {
        if (!fs.existsSync(this.latestDir)) fs.mkdirSync(this.latestDir, { recursive: true });
        fs.writeFileSync(path.join(this.latestDir, 'summary.json'), JSON.stringify(payload, null, 2));
      } catch {}
    }

    return summaryPath;
  }
}

module.exports = {
  ArtifactCollector,
};
