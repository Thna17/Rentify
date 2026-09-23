const addIndexIfMissing = async (queryInterface, table, fields, name, options = {}) => {
  const indexes = await queryInterface.showIndex(table);
  const fieldList = fields.join(",");
  if (!indexes.some((index) => index.name === name || index.fields.map((field) => field.attribute).join(",") === fieldList)) {
    await queryInterface.addIndex(table, fields, { name, ...options });
  }
};

exports.up = async ({ queryInterface }) => {
  const models = require("../models");
  const indexes = [
    [models.WebsiteData, ["websiteId"], "idx_website_data_platform_website"],
    [models.WebsiteData, ["status"], "idx_website_data_status"],
    [models.Product, ["websiteId", "status"], "idx_products_website_status"],
    [models.Product, ["websiteId", "categoryId"], "idx_products_website_category"],
    [models.Category, ["websiteId", "status"], "idx_categories_website_status"],
    [models.Customer, ["storeId", "status"], "idx_customers_store_status"],
    [models.Cart, ["websiteId", "updatedAt"], "idx_carts_website_updated"],
    [models.Order, ["websiteId", "status", "createdAt"], "idx_orders_website_status_created"],
    [models.Order, ["customerId", "createdAt"], "idx_orders_customer_created"],
    [models.Invoice, ["websiteId", "status", "createdAt"], "idx_invoices_website_status_created"],
    [models.Payment, ["orderId", "status"], "idx_payments_order_status"],
    [models.UsageEvent, ["websiteId", "eventType", "occurredAt"], "idx_usage_events_website_event_time"],
    [models.BillingStatement, ["websiteId", "status"], "idx_billing_statements_website_status"],
    [models.PaymentGatewayConfig, ["websiteId", "gateway"], "idx_gateway_config_website_gateway"],
  ];
  for (const [model, fields, name] of indexes) {
    await addIndexIfMissing(queryInterface, model.getTableName(), fields, name);
  }
};
