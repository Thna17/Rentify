// models/Website.js (added customColors for dynamic custom themes, though content-based is primary)
const { DataTypes } = require("sequelize");
const { hostedStorefrontUrl } = require("../utils/hostedStorefrontOrigin");
const sequelize = require("../config/db");

const Website = sequelize.define(
  "Website",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: "user_website_unique",
      references: {
        model: "Users",
        key: "id",
      },
    },
    storeId: {
      type: DataTypes.UUID,
      allowNull: true,
      unique: true,
      references: { model: 'Stores', key: 'id' },
    },
    templateId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "WebsiteTemplates",
        key: "id",
      },
    },
    vercelDeploymentId: {
      type: DataTypes.UUID,
      allowNull: true,
      // references: {
      //   model: 'VercelDeployment',
      //   key: 'id'
      // }
    },
    paymentId: {
      // Add paymentId field
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "Payments",
        key: "id",
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    domain: {
      type: DataTypes.STRING,
      allowNull: true,
      // unique: true,
      // validate: {
      //   isUrl: true
      // }
    },
    // Rentify-hosted address label: <subdomain>.<HOSTED_STOREFRONT_DOMAIN>.
    // `domain` stays for addresses the merchant connects themselves.
    subdomain: {
      type: DataTypes.STRING(63),
      allowNull: true,
      unique: 'uq_websites_subdomain',
    },
    // Where shoppers reach the store: its Rentify subdomain once published.
    storefrontUrl: {
      type: DataTypes.VIRTUAL,
      get() {
        const subdomain = this.getDataValue('subdomain');
        return subdomain ? hostedStorefrontUrl(subdomain) : null;
      },
    },
    status: {
      type: DataTypes.ENUM(
        "customization",
        "pending",
        "active",
        "building",
        "suspended",
        "expired",
        "archived",
        "deleted",
        "failed"
      ),
      defaultValue: "customization",
      allowNull: false,
    },
    deploymentLogs: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    lastDeployment: {
      type: DataTypes.DATE,
    },
    subscriptionId: {
      type: DataTypes.UUID,
      references: { model: "Subscriptions", key: "id" },
    },
    deploymentHistory: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    analytics: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    storage: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    pricing: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    limits: {
      type: DataTypes.JSON,
      defaultValue: {
        staff: 1,
        storage: 1024, // MB
        products: 5,
        // ... other limits
      },
    },
    currentUsage: {
      type: DataTypes.JSON,
      defaultValue: {
        staff: 0,
        storage: 0,
        products: 0,
      },
    },
  },
  { timestamps: true }
);

module.exports = Website;
