const fs = require("fs");
const path = require("path");
const { sequelize } = require("../config/db");

const directory = __dirname;
const files = () => fs.readdirSync(directory)
  .filter((file) => /^\d+_.+\.js$/.test(file))
  .sort();

const hasMetaTable = async () => (await sequelize.getQueryInterface().showAllTables())
  .some((table) => String(table).toLowerCase() === "sequelizemeta");

const ensureMetaTable = async () => {
  if (await hasMetaTable()) return;
  await sequelize.getQueryInterface().createTable("SequelizeMeta", {
    name: { type: "VARCHAR(255)", allowNull: false, primaryKey: true },
    appliedAt: { type: "DATETIME", allowNull: false },
  });
};

const applied = async () => {
  const [rows] = await sequelize.query("SELECT name FROM SequelizeMeta ORDER BY name");
  return new Set(rows.map((row) => row.name));
};

const migrate = async () => {
  await ensureMetaTable();
  const completed = await applied();
  for (const name of files()) {
    if (completed.has(name)) continue;
    const migration = require(path.join(directory, name));
    await migration.up({ sequelize, queryInterface: sequelize.getQueryInterface() });
    await sequelize.query("INSERT INTO SequelizeMeta (name, appliedAt) VALUES (?, ?)", {
      replacements: [name, new Date()],
    });
    console.log(`Applied migration ${name}`);
  }
};

const verify = async () => {
  if (!(await hasMetaTable())) throw new Error("SequelizeMeta is missing; run db:migrate");
  const completed = await applied();
  const pending = files().filter((name) => !completed.has(name));
  if (pending.length) throw new Error(`Pending migrations: ${pending.join(", ")}`);
  console.log("Migration verification passed");
};

const command = process.argv[2] || "migrate";
(async () => {
  try {
    if (command === "migrate") await migrate();
    else if (command === "verify") await verify();
    else throw new Error(`Unknown migration command: ${command}`);
  } finally {
    await sequelize.close();
  }
})().catch((error) => {
  console.error("Migration command failed");
  console.error(error.message);
  process.exitCode = 1;
});

module.exports = { migrate, verify };
