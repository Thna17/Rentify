const { sequelize } = require("./db");

const syncDB = async () => {
  // Migrations are an explicit deployment operation (`npm run db:migrate`).
  // Startup must never alter production schema or seed data.
  await sequelize.authenticate();
};

module.exports = syncDB;
