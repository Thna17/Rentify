// Baseline is intentionally non-destructive. It creates missing tables from
// the current model definitions but never alters or drops an existing table.
exports.up = async ({ sequelize }) => {
  require("../models");
  await sequelize.sync({ force: false, alter: false, logging: false });
};
