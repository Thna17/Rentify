const service = require('./durableNotificationService');
const { logger } = require('../../utils/logger');

function startDurableNotificationJob() {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const result = await service.consumeCoreEvents();
      for (const failure of result.failures) logger.warn('Notification event processing failed', failure);
      await service.processPending();
    } catch (error) {
      logger.error('Notification worker failed', { code: error.code || 'NOTIFICATION_WORKER_FAILED' });
    } finally { running = false; }
  };
  const timer = setInterval(run, 30000);
  timer.unref();
  return timer;
}
module.exports = { startDurableNotificationJob };
