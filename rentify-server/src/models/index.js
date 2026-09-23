const Website = require("./Website");
const WebsiteTemplate = require("./WebsiteTemplate");
const User = require("./User");
const TemplateContent = require("./TemplateContent");
const Staff = require("./Staff");
const Payment = require("./Payment");
const Subscription = require("./Subscription");
const Package = require('./Package');
const WebsiteContent = require("./WebsiteContent");
const OutcomeContract = require("./OutcomeContract");
const ReminderLog = require("./ReminderLog");

Payment.belongsTo(User, { foreignKey: "userId" });
Payment.belongsTo(Website, { foreignKey: "websiteId" });

Staff.belongsTo(User, { foreignKey: "merchantId", as: "merchant" });
User.hasMany(Staff, { foreignKey: "merchantId", as: "staffs" });
// Website ↔ WebsiteTemplate
Website.belongsTo(WebsiteTemplate, { foreignKey: "templateId" });
WebsiteTemplate.hasMany(Website, { foreignKey: "templateId" });

// User ↔ Website
User.hasMany(Website, { foreignKey: "userId" });
Website.belongsTo(User, { foreignKey: "userId" });

// WebsiteTemplate → TemplateContent (Cascade on delete/update)
WebsiteTemplate.hasMany(TemplateContent, {
  foreignKey: "templateId",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
TemplateContent.belongsTo(WebsiteTemplate, {
  foreignKey: "templateId",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Website.hasMany(WebsiteContent, {
  foreignKey: "websiteId",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
  as: "WebsiteContents"
});
WebsiteContent.belongsTo(Website, {
  foreignKey: "websiteId",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});



// Website.hasMany(PaymentGatewayConfig, {
//   foreignKey: "websiteId",
//   as: "paymentConfigs",
//   onDelete: "CASCADE",
// });
// PaymentGatewayConfig.belongsTo(Website, {
//   foreignKey: "websiteId",
// });

Website.belongsTo(Subscription, { foreignKey: "subscriptionId" });
Subscription.hasMany(Website, { foreignKey: "subscriptionId" });

Subscription.belongsTo(User, { foreignKey: "userId" });
User.hasMany(Subscription, { foreignKey: "userId" });

Subscription.belongsTo(Package, { foreignKey: "packageId" });
Package.hasMany(Subscription, { foreignKey: "packageId" });

Subscription.belongsTo(Payment, { foreignKey: "paymentId" });
Payment.hasMany(Subscription, { foreignKey: "paymentId" });

Website.hasMany(Staff, {
  foreignKey: "websiteId",
  as: "staffs",
  onDelete: "CASCADE",
});

Staff.belongsTo(Website, {
  foreignKey: "websiteId",
  as: "website",
});
Website.hasOne(Subscription, {
  foreignKey: "websiteId",
  onDelete: "CASCADE",
});

Subscription.belongsTo(Website, {
  foreignKey: "websiteId",
});

Website.hasMany(OutcomeContract, { foreignKey: "websiteId" });
OutcomeContract.belongsTo(Website, { foreignKey: "websiteId" });

Website.hasMany(ReminderLog, { foreignKey: "websiteId" });
ReminderLog.belongsTo(Website, { foreignKey: "websiteId" });


module.exports = {
  Website,
  WebsiteTemplate,
  User,
  TemplateContent,
  Staff,
  Payment,
  Subscription,
  Package,
  WebsiteContent,
  OutcomeContract,
  ReminderLog
};
