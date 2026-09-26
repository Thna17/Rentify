const { Op } = require("sequelize");
const { UsageEvent, BillingStatement } = require("../../models");
const { sequelize } = require("../../config/db");
const { round2 } = require("./usageAggregationService");

const USE_VIEW_FREE_THRESHOLD =
  process.env.USAGE_FREE_VIEWS_ENABLED === "true";
const FREE_VIEWS_COUNT = 100;

const getMonthRange = (month) => {
  const [year, monthStr] = month.split("-");
  const start = new Date(`${year}-${monthStr}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { start, end };
};

const applyFreeViews = (breakdown) => {
  if (!USE_VIEW_FREE_THRESHOLD || !breakdown.STORE_VIEW) return breakdown;
  const freeCount = Math.min(FREE_VIEWS_COUNT, breakdown.STORE_VIEW.count);
  const adjustedCount = breakdown.STORE_VIEW.count - freeCount;
  const unitCost = breakdown.STORE_VIEW.count
    ? breakdown.STORE_VIEW.cost / breakdown.STORE_VIEW.count
    : 0;
  return {
    ...breakdown,
    STORE_VIEW: {
      count: adjustedCount,
      cost: round2(adjustedCount * unitCost),
      freeApplied: freeCount,
    },
  };
};

const summarizeEvents = async (websiteId, month) => {
  const { start, end } = getMonthRange(month);

  const events = await UsageEvent.findAll({
    where: {
      websiteId,
      occurredAt: { [Op.gte]: start, [Op.lt]: end },
    },
    attributes: ["eventType", "quantity", "pricePerUnit"],
  });

  const breakdown = events.reduce((acc, event) => {
    const type = event.eventType;
    const count = Number(event.quantity || 0);
    const cost = round2(count * Number(event.pricePerUnit || 0));
    if (!acc[type]) acc[type] = { count: 0, cost: 0 };
    acc[type].count += count;
    acc[type].cost = round2(acc[type].cost + cost);
    return acc;
  }, {});

  const adjusted = applyFreeViews(breakdown);
  const total = round2(
    Object.values(adjusted).reduce((sum, item) => sum + item.cost, 0)
  );

  return { breakdown: adjusted, totalAmount: total };
};

const getBillingSummary = async (websiteId, month) => {
  const existing = await BillingStatement.findOne({
    where: { websiteId, month },
  });
  if (existing) {
    return existing;
  }

  const { breakdown, totalAmount } = await summarizeEvents(websiteId, month);
  return BillingStatement.build({
    websiteId,
    month,
    breakdown,
    totalAmount,
    status: "pending",
  });
};

const finalizeMonthlyStatement = async (websiteId, month) => {
  // The database unique key (websiteId, month) is the idempotency boundary.
  // Concurrent billing jobs either create one statement or return that one.
  try {
    return await sequelize.transaction(async (transaction) => {
      const existing = await BillingStatement.findOne({
        where: { websiteId, month },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (existing) return existing;

      const { breakdown, totalAmount } = await summarizeEvents(websiteId, month);
      return BillingStatement.create({
        websiteId,
        month,
        breakdown,
        totalAmount,
        status: "pending",
      }, { transaction });
    });
  } catch (error) {
    if (error.name !== "SequelizeUniqueConstraintError") throw error;
    return BillingStatement.findOne({ where: { websiteId, month } });
  }
};

module.exports = {
  getBillingSummary,
  finalizeMonthlyStatement,
  summarizeEvents,
  getMonthRange,
};
