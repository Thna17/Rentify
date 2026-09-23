const ecommerceSyncService = require('../services/ecommerceSyncService');
const { logger } = require('../utils/logger');

let running = false;

const run = async () => {
  if (running) return;
  running = true;
  try {
    await ecommerceSyncService.retryPendingWebsiteData();
  } catch (error) {
    logger.error('Website sync retry failed', { error: error.message });
  } finally {
    running = false;
  }
};

const startWebsiteSyncJob = () => {
  const timer = setInterval(run, 60_000);
  timer.unref();
  run();
};

module.exports = { startWebsiteSyncJob };
