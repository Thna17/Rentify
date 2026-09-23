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
  BillingStatement
};
