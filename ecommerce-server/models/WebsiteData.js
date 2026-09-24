// models/WebsiteData.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const WebsiteData = sequelize.define('WebsiteData', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  domain: {
    type: DataTypes.STRING,
    allowNull: true
  },
  websiteId: {
    type: DataTypes.UUID,
    // This is the Core API website UUID and is the commerce tenant key.
    allowNull: false,
    unique: true,
  },
  storeId: { type: DataTypes.UUID, allowNull: true },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  niche: {
    type: DataTypes.ENUM('restaurant', 'ecommerce', 'cafe', 'blog', 'fashion', 'skincare', 'electronics', 'grocery'),
    allowNull: false,
    defaultValue: 'ecommerce'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended', 'maintenance'),
    defaultValue: 'active'
  },
  // Enhanced business-specific configuration
  businessConfig: {
    type: DataTypes.JSON,
    defaultValue: {},
    validate: {
      isValidBusinessConfig(value) {
        const allowedConfigs = {
          restaurant: ['tableBooking', 'delivery', 'takeaway', 'reservations'],
          ecommerce: ['inventory', 'shipping', 'tax', 'reviews'],
          cafe: ['tableBooking', 'takeaway', 'delivery', 'loyaltyProgram'],
          fashion: ['sizeGuide', 'wishlist', 'outOfStockNotifications'],
          skincare: ['ingredientInfo', 'skinTypeMatching', 'allergyWarnings']
        };
        
        if (value && typeof value === 'object') {
          Object.keys(value).forEach(key => {
            if (!allowedConfigs[this.niche]?.includes(key)) {
              throw new Error(`Invalid business config '${key}' for niche '${this.niche}'`);
            }
          });
        }
      }
    }
  },
  userData: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {
      id: null,
      name: null,
      email: null,
      phoneNumber: null,
      businessName: null,
      address: null
    }
  },
  staffData: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  package: {
    type: DataTypes.JSON,
    allowNull: true
  },
  websiteTemplateId: DataTypes.UUID,
  // Store niche-specific settings
  nicheSettings: {
    type: DataTypes.JSON,
    defaultValue: {}
  }
}, {
  indexes: [
    { fields: ['domain'] },
    { fields: ['websiteId'], unique: true },
    { fields: ['userId'] },
    { fields: ['niche'] },
    { fields: ['status'] }
  ]
});

module.exports = WebsiteData;
