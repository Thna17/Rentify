const cron = require("node-cron");
const { runReminderCycle } = require("./raasReminderService");
const { logger } = require("../../utils/logger");

const scheduleRaasReminders = () => {
  cron.schedule("*/15 * * * *", async () => {
    try {
      await runReminderCycle();
    } catch (error) {
      logger.error("RaaS reminder job failed", { error: error.message });
    }
  });
};

module.exports = { scheduleRaasReminders };
