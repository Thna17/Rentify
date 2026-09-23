const addIndexIfMissing = async (queryInterface, table, fields, name, options = {}) => {
  const indexes = await queryInterface.showIndex(table);
  const fieldList = fields.join(",");
  if (!indexes.some((index) => index.name === name || index.fields.map((field) => field.attribute).join(",") === fieldList)) {
    await queryInterface.addIndex(table, fields, { name, ...options });
  }
};

exports.up = async ({ queryInterface }) => {
  const models = require("../models");
  // Tenant ownership and state-reporting access paths.
  const indexes = [
    [models.Website, ["userId"], "idx_websites_user_id"],
    [models.Website, ["templateId"], "idx_websites_template_id"],
    [models.Website, ["status"], "idx_websites_status"],
    [models.Staff, ["merchantId", "websiteId"], "idx_staff_merchant_website"],
    [models.Subscription, ["userId", "status"], "idx_subscriptions_user_status"],
    [models.Subscription, ["websiteId", "status"], "idx_subscriptions_website_status"],
    [models.Payment, ["userId", "status"], "idx_payments_user_status"],
    [models.Payment, ["websiteId", "status"], "idx_payments_website_status"],
    [models.WebsiteContent, ["websiteId", "type"], "idx_website_content_tenant_type"],
    [models.TemplateContent, ["templateId", "category"], "idx_template_content_template_category"],
    [models.OutcomeContract, ["websiteId", "status"], "idx_outcomes_website_status"],
  ];
  for (const [model, fields, name] of indexes) await addIndexIfMissing(queryInterface, model.getTableName(), fields, name);
};
