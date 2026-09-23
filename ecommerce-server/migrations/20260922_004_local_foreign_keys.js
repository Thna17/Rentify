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
  // Only local database relations get FKs. websiteId is a Core API UUID, so a
  // cross-service SQL foreign key would be invalid and is protected in code.
  await addForeignKeyIfMissing(queryInterface, table(models.Payment), "orderId", table(models.Order), "fk_payments_order");
  await addForeignKeyIfMissing(queryInterface, table(models.Invoice), "orderId", table(models.Order), "fk_invoices_order");
  await addForeignKeyIfMissing(queryInterface, table(models.OrderItem), "orderId", table(models.Order), "fk_order_items_order", "CASCADE");
  await addForeignKeyIfMissing(queryInterface, table(models.CartItem), "cartId", table(models.Cart), "fk_cart_items_cart", "CASCADE");
  await addForeignKeyIfMissing(queryInterface, table(models.ProductVariant), "productId", table(models.Product), "fk_product_variants_product", "CASCADE");
  await addForeignKeyIfMissing(queryInterface, table(models.ProductOption), "productId", table(models.Product), "fk_product_options_product", "CASCADE");
};
