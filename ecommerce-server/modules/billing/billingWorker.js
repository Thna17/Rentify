const cron = require("node-cron");
const { UsageEvent } = require("../../models");
const { finalizeMonthlyStatement } = require("./billingService");

const getPreviousMonth = () => {
  const now = new Date();
  now.setDate(1);
  now.setMonth(now.getMonth() - 1);
  return now.toISOString().slice(0, 7);
};

const start = () => {
  cron.schedule("10 0 * * *", async () => {
    const month = getPreviousMonth();
    const websiteIds = await UsageEvent.findAll({
      attributes: ["websiteId"],
      group: ["websiteId"],
    });

    for (const row of websiteIds) {
      const websiteId = row.get("websiteId");
      await finalizeMonthlyStatement(websiteId, month);
    }
  });
};

module.exports = { start };
