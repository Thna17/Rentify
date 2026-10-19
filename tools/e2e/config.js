// tools/e2e/config.js - Deterministic configuration for E2E harness

const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '../..');

const PORT_CORE = Number(process.env.E2E_PORT_CORE || 3199);
const PORT_COMMERCE = Number(process.env.E2E_PORT_COMMERCE || 4199);
const PORT_MARKETPLACE = Number(process.env.E2E_PORT_MARKETPLACE || 4599);
const PORT_MERCHANT = Number(process.env.E2E_PORT_MERCHANT || 4499);

const HOST = '127.0.0.1';

const URLS = {
  coreApi: `http://${HOST}:${PORT_CORE}`,
  commerceApi: `http://${HOST}:${PORT_COMMERCE}`,
  marketplace: `http://${HOST}:${PORT_MARKETPLACE}`,
  merchant: `http://${HOST}:${PORT_MERCHANT}`,
};

const TIMEOUTS = {
  serverStartup: 15000,
  navigation: 10000,
  selector: 8000,
  networkIdle: 5000,
  pollInterval: 50,
};

module.exports = {
  ROOT_DIR,
  PORT_CORE,
  PORT_COMMERCE,
  PORT_MARKETPLACE,
  PORT_MERCHANT,
  HOST,
  URLS,
  TIMEOUTS,
};
