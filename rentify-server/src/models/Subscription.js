const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Subscription = sequelize.define(
  "Subscription",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    packageId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    websiteId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "Websites",
        key: "id",
      },
    },

    startDate: DataTypes.DATE,
    endDate: DataTypes.DATE,
    status: {
      type: DataTypes.ENUM(
        "active",
        "pending",
        "expired",
        "suspended",
        "trial"
      ),
      defaultValue: "pending",
    },
    paymentId: DataTypes.UUID,
  },
  { timestamps: true }
);

module.exports = Subscription;
