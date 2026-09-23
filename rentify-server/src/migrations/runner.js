const fs = require("fs");
const path = require("path");
const sequelize = require("../config/db");

const migrationsDirectory = __dirname;
const migrationFiles = () => fs.readdirSync(migrationsDirectory)
  .filter((file) => /^\d+_.+\.js$/.test(file))
  .sort();

const ensureMetaTable = async () => {
  const tables = await sequelize.getQueryInterface().showAllTables();
  if (tables.some((table) => String(table).toLowerCase() === "sequelizemeta")) return;
  await sequelize.getQueryInterface().createTable("SequelizeMeta", {
    name: { type: "VARCHAR(255)", allowNull: false, primaryKey: true },
    appliedAt: { type: "DATETIME", allowNull: false },
  });
};

const appliedMigrationNames = async () => {
  const [rows] = await sequelize.query("SELECT name FROM SequelizeMeta ORDER BY name");
  return new Set(rows.map((row) => row.name));
};

const migrate = async () => {
  await ensureMetaTable();
  const applied = await appliedMigrationNames();
  for (const name of migrationFiles()) {
    if (applied.has(name)) continue;
    const migration = require(path.join(migrationsDirectory, name));
    await migration.up({ sequelize, queryInterface: sequelize.getQueryInterface() });
    await sequelize.query("INSERT INTO SequelizeMeta (name, appliedAt) VALUES (?, ?)", {
      replacements: [name, new Date()],
    });
    console.log(`Applied migration ${name}`);
  }
};

const verify = async () => {
  const queryInterface = sequelize.getQueryInterface();
  const tables = await queryInterface.showAllTables();
  if (!tables.some((table) => String(table).toLowerCase() === "sequelizemeta")) throw new Error("SequelizeMeta is missing; run db:migrate");
  const applied = await appliedMigrationNames();
  const pending = migrationFiles().filter((name) => !applied.has(name));
  if (pending.length) throw new Error(`Pending migrations: ${pending.join(", ")}`);
  console.log("Migration verification passed");
};

const command = process.argv[2] || "migrate";
(async () => {
  try {
    if (command === "verify") await verify();
    else if (command === "migrate") await migrate();
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
