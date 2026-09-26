const { PricingRule } = require("../../models");
const { Op } = require("sequelize");

const DEFAULT_RULES = [
  { eventType: "ORDER_PAID", pricePerUnit: 0.05 },
  { eventType: "INVOICE_PAID", pricePerUnit: 0.03 },
  { eventType: "STORE_VIEW", pricePerUnit: 0.0005 },
];

const ensureDefaultPricingRules = async () => {
  const existing = await PricingRule.findAll();
  if (existing.length) return;

  const today = new Date().toISOString().slice(0, 10);
  await PricingRule.bulkCreate(
    DEFAULT_RULES.map((rule) => ({
      ...rule,
      currency: "USD",
      effectiveFrom: today,
      effectiveTo: null,
    }))
  );
};

const findRuleForEvent = async (eventType, occurredAt) => {
  const date = occurredAt ? new Date(occurredAt) : new Date();
  const dateStr = date.toISOString().slice(0, 10);
  return PricingRule.findOne({
    where: {
      eventType,
      effectiveFrom: { [Op.lte]: dateStr },
      [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: dateStr } }],
    },
    order: [["effectiveFrom", "DESC"]],
  });
};

module.exports = { ensureDefaultPricingRules, findRuleForEvent };
