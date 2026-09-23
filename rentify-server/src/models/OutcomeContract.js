const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const OutcomeContract = sequelize.define(
  "OutcomeContract",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    websiteId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    resultType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "on_time_invoice",
    },
    targetIncrease: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.25,
    },
    measurementWindowDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60,
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("active", "paused", "completed"),
      allowNull: false,
      defaultValue: "active",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    pausedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    effectiveFrom: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    effectiveTo: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    conditions: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
  },
  {
    indexes: [
      { fields: ["websiteId"] },
      { fields: ["resultType"] },
      { fields: ["status"] },
      { fields: ["isActive"] },
    ],
  }
);

module.exports = OutcomeContract;
