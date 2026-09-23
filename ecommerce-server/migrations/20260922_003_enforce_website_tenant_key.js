const { DataTypes } = require("sequelize");

exports.up = async ({ sequelize, queryInterface }) => {
  const { WebsiteData } = require("../models");
  const table = WebsiteData.getTableName();
  const [nullRows] = await sequelize.query(`SELECT COUNT(*) AS count FROM \`${table}\` WHERE websiteId IS NULL`);
  if (Number(nullRows[0].count) > 0) {
    throw new Error("Cannot enforce WebsiteData.websiteId: backfill tenant IDs before migrating");
  }
  const [duplicates] = await sequelize.query(
    `SELECT websiteId FROM \`${table}\` GROUP BY websiteId HAVING COUNT(*) > 1 LIMIT 1`
  );
  if (duplicates.length) {
    throw new Error("Cannot enforce WebsiteData.websiteId uniqueness: resolve duplicate tenant records first");
  }
  await queryInterface.changeColumn(table, "websiteId", {
    type: DataTypes.UUID,
    allowNull: false,
  });
  const indexes = await queryInterface.showIndex(table);
  if (!indexes.some((index) => index.unique && index.fields.map((field) => field.attribute).join(",") === "websiteId")) {
    await queryInterface.addIndex(table, ["websiteId"], {
      name: "uniq_website_data_website_id",
      unique: true,
    });
  }
};
