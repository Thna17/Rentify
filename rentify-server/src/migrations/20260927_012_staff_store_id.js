const { DataTypes } = require("sequelize");

// Staff membership bound directly to Store.
// websiteId becomes optional channel context.
exports.up = async ({ queryInterface }) => {
  const models = require("../models");
  const table = models.Staff.getTableName();
  const columns = await queryInterface.describeTable(table);
  if (!columns.storeId) {
    await queryInterface.addColumn(table, "storeId", {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: models.Store.getTableName(),
        key: "id",
      },
    });
  }
};
