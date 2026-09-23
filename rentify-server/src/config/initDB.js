const sequelize = require("./db");

const syncDB = async () => {
  // Schema changes are deliberately executed by `npm run db:migrate`, never
  // by application startup. This makes production deploys predictable.
  await sequelize.authenticate();
};

module.exports = syncDB;
