const addForeignKeyIfMissing = async (queryInterface, source, field, target, name, onDelete = "RESTRICT") => {
  const foreignKeys = await queryInterface.getForeignKeyReferencesForTable(source);
  if (foreignKeys.some((key) => key.columnName === field)) return;
  await queryInterface.addConstraint(source, {
    fields: [field],
    type: "foreign key",
    name,
    references: { table: target, field: "id" },
    onUpdate: "CASCADE",
    onDelete,
  });
};

exports.up = async ({ queryInterface }) => {
  const models = require("../models");
  const table = (model) => model.getTableName();
  await addForeignKeyIfMissing(queryInterface, table(models.Website), "userId", table(models.User), "fk_websites_user");
  await addForeignKeyIfMissing(queryInterface, table(models.Website), "templateId", table(models.WebsiteTemplate), "fk_websites_template");
  await addForeignKeyIfMissing(queryInterface, table(models.Staff), "merchantId", table(models.User), "fk_staff_merchant");
  await addForeignKeyIfMissing(queryInterface, table(models.Staff), "websiteId", table(models.Website), "fk_staff_website", "CASCADE");
  await addForeignKeyIfMissing(queryInterface, table(models.Subscription), "userId", table(models.User), "fk_subscriptions_user");
  await addForeignKeyIfMissing(queryInterface, table(models.Subscription), "packageId", table(models.Package), "fk_subscriptions_package");
  await addForeignKeyIfMissing(queryInterface, table(models.Subscription), "websiteId", table(models.Website), "fk_subscriptions_website", "CASCADE");
  await addForeignKeyIfMissing(queryInterface, table(models.WebsiteContent), "websiteId", table(models.Website), "fk_website_contents_website", "CASCADE");
  await addForeignKeyIfMissing(queryInterface, table(models.OutcomeContract), "websiteId", table(models.Website), "fk_outcome_contracts_website", "CASCADE");
  await addForeignKeyIfMissing(queryInterface, table(models.ReminderLog), "websiteId", table(models.Website), "fk_reminder_logs_website", "CASCADE");
};
