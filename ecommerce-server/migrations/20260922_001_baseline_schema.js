// Non-destructive baseline for new databases. Existing development databases
// keep their rows and tables unchanged; later migrations are additive.
exports.up = async ({ sequelize }) => {
  require("../models");
  await sequelize.sync({ force: false, alter: false, logging: false });
  await require("../modules/billing/pricingRuleService").ensureDefaultPricingRules();
};
