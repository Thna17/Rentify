const { Op, fn, col, literal } = require("sequelize");
const { UsageEvent } = require("../../models");

const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;

const getSummary = async ({ websiteId, rangeDays }) => {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - rangeDays);

  const events = await UsageEvent.findAll({
    where: {
      websiteId,
      occurredAt: { [Op.between]: [from, to] },
    },
    attributes: [
      "eventType",
      [fn("sum", col("quantity")), "count"],
      [fn("sum", literal("quantity * pricePerUnit")), "cost"],
    ],
    group: ["eventType"],
  });

  const breakdown = events.reduce((acc, row) => {
    const type = row.get("eventType");
    acc[type] = {
      count: Number(row.get("count") || 0),
      cost: round2(row.get("cost")),
    };
    return acc;
  }, {});

  const totalCost = round2(
    Object.values(breakdown).reduce((sum, item) => sum + item.cost, 0)
  );

  return { breakdown, totalCost, from, to };
};

const getBreakdown = async ({
  websiteId,
  from,
  to,
  eventType,
  page,
  pageSize,
}) => {
  const where = {
    websiteId,
    occurredAt: { [Op.between]: [from, to] },
  };
  if (eventType) where.eventType = eventType;

  const offset = (page - 1) * pageSize;

  const rows = await UsageEvent.findAll({
    where,
    attributes: [
      [fn("date", col("occurredAt")), "date"],
      "eventType",
      [fn("sum", col("quantity")), "count"],
      [fn("sum", literal("quantity * pricePerUnit")), "cost"],
    ],
    group: [fn("date", col("occurredAt")), "eventType"],
    order: [[fn("date", col("occurredAt")), "DESC"]],
    limit: pageSize,
    offset,
  });

  const totalGroups = await UsageEvent.findAll({
    where,
    attributes: [
      [fn("date", col("occurredAt")), "date"],
      "eventType",
    ],
    group: [fn("date", col("occurredAt")), "eventType"],
    raw: true,
  });

  return {
    rows: rows.map((row) => ({
      date: row.get("date"),
      eventType: row.get("eventType"),
      count: Number(row.get("count") || 0),
      cost: round2(row.get("cost")),
    })),
    totalRows: totalGroups.length,
  };
};

module.exports = { getSummary, getBreakdown, round2 };
