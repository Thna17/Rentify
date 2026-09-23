// models/index.js (Port 4000 - Complete)
const Cart = require("./Cart");
const CartItem = require("./CartItem");
const Product = require("./Product");
const ProductVariant = require("./ProductVariant");
const ProductOption = require("./ProductOption");
const Order = require("./Order");
const OrderItem = require("./OrderItem");
const Payment = require("./Payment");
const WebsiteData = require("./WebsiteData");
const Invoice = require("./Invoice");
const ShippingDetail = require("./ShippingDetail");
const Category = require("./Category");
const Customer = require("./Customer");
const PaymentGatewayConfig = require("./PaymentGatewayConfig");
const WebsiteContent = require("./WebsiteContent");
const UsageEvent = require("./UsageEvent");
const PricingRule = require("./PricingRule");
const BillingStatement = require("./BillingStatement");
const StoreAccess = require('./StoreAccess');

Product.belongsTo(StoreAccess, {
  as: 'storeAccess', foreignKey: 'storeId', targetKey: 'storeId', constraints: false,
});

// During the compatibility period, website routes still create commerce rows.
// Attach the canonical Store key from the trusted Website projection and reject
// a client-supplied Store key that points at another tenant.
for (const model of [Product, Category, Cart, Order, Invoice, UsageEvent, BillingStatement, PaymentGatewayConfig]) {
  model.addHook('beforeValidate', 'assignCanonicalStore', async (row, options) => {
    if (!row.websiteId) return;
    const website = await WebsiteData.findOne({
      where: { websiteId: row.websiteId },
      attributes: ['storeId'],
      transaction: options.transaction,
    });
    if (!website?.storeId) {
      if (row.storeId) throw new Error('Store projection is not ready for this Website');
      return;
    }
    if (row.storeId && row.storeId !== website.storeId) throw new Error('Store does not match Website');
    row.storeId = website.storeId;
  });
}

Payment.addHook('beforeValidate', 'assignCanonicalStore', async (payment, options) => {
  if (!payment.orderId) return;
  const order = await Order.findByPk(payment.orderId, {
    attributes: ['storeId'], transaction: options.transaction,
  });
  if (!order?.storeId) {
    if (payment.storeId) throw new Error('Order Store projection is not ready');
    return;
  }
  if (payment.storeId && payment.storeId !== order.storeId) throw new Error('Payment Store does not match Order');
  payment.storeId = order.storeId;
});

Customer.addHook('beforeValidate', 'assignCanonicalStore', async (customer, options) => {
  if (!customer.storeId) return;
  const website = await WebsiteData.findOne({
    where: { websiteId: customer.storeId },
    attributes: ['storeId'], transaction: options.transaction,
  });
  if (!website?.storeId) return;
  if (customer.tenantStoreId && customer.tenantStoreId !== website.storeId) {
    throw new Error('Customer Store does not match Website');
  }
  customer.tenantStoreId = website.storeId;
});

// Cart associations
Cart.hasMany(CartItem, { foreignKey: "cartId", as: "CartItems" });
CartItem.belongsTo(Cart, { foreignKey: "cartId" });
CartItem.belongsTo(Product, { foreignKey: "productId", onDelete: "CASCADE" });
CartItem.belongsTo(ProductVariant, { foreignKey: "variantId", onDelete: "CASCADE" });

// Product associations
Product.hasMany(ProductVariant, { foreignKey: "productId", as: "ProductVariants" });
Product.hasMany(ProductOption, { foreignKey: "productId", as: "ProductOptions" });
Product.belongsTo(Category, { foreignKey: "categoryId" });
Category.hasMany(Product, { foreignKey: "categoryId" });

// Order associations
Cart.hasOne(Order, { foreignKey: "cartId" });
Order.belongsTo(Cart, { foreignKey: "cartId" });

Order.hasMany(OrderItem, { foreignKey: "orderId", as: "OrderItems" });
OrderItem.belongsTo(Order, { foreignKey: "orderId" });
OrderItem.belongsTo(Product, { foreignKey: "productId" });
OrderItem.belongsTo(ProductVariant, { foreignKey: "variantId" });

Order.hasOne(Payment, { foreignKey: "orderId", as: "Payment" });
Payment.belongsTo(Order, { foreignKey: "orderId" });

Order.hasOne(Invoice, { foreignKey: "orderId", as: "Invoice" });
Invoice.belongsTo(Order, { foreignKey: "orderId" });

Order.hasOne(ShippingDetail, { foreignKey: "orderId", as: "ShippingDetail" });
ShippingDetail.belongsTo(Order, { foreignKey: "orderId" });

// Website associations
WebsiteData.hasMany(WebsiteContent, {
  foreignKey: "websiteId",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
  as: "WebsiteContents"
});
WebsiteContent.belongsTo(WebsiteData, {
  foreignKey: "websiteId",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// Customer associations
Customer.hasMany(Order, { foreignKey: "customerId", as: "Orders" });
Order.belongsTo(Customer, { foreignKey: "customerId" });

Customer.hasMany(Cart, { foreignKey: "customerId", as: "Carts" });
Cart.belongsTo(Customer, { foreignKey: "customerId" });

module.exports = {
  Cart,
  CartItem,
  Product,
  ProductVariant,
  ProductOption,
  Order,
  OrderItem,
  Payment,
  WebsiteData,
  Invoice,
  ShippingDetail,
  Category,
  Customer,
  PaymentGatewayConfig,
  WebsiteContent,
  UsageEvent,
  PricingRule,
  BillingStatement,
  StoreAccess
};
