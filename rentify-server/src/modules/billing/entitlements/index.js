// rentify-server/src/modules/billing/entitlements/index.js
const capabilityConfig = require('./capabilityConfig');
const entitlementService = require('./entitlementService');

module.exports = {
  ...capabilityConfig,
  entitlementService,
};
