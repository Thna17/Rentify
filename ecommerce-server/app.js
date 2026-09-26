const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const cors = require('cors');
const cookieParser = require('cookie-parser');

const helmetConfig = require('./config/helmetConfig');
const corsOptions = require('./config/corsConfig');
const sessionConfig = require('./config/sessionConfig');
const sessionMiddleware = require('./middlewares/sessionMiddleware');
// const TelegramService = require('./modules/notifications/telegramService');

const app = express();

// Middleware
app.use(helmetConfig);
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET || 'default'));
app.use(sessionConfig);
app.use(sessionMiddleware);

// Container and load-balancer health probe. It intentionally reveals no
// tenant or payment-provider details.
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

// Setup Telegram webhook
// TelegramService.setupWebhook(app);

// Your routes
app.use('/api/website-data', require('./modules/websites/websiteRoutes'));
app.use('/api/store-access', require('./modules/store-access/storeAccessRoutes'));
app.use('/api', require('./modules/store-catalog/storeCatalogRoutes'));
app.use('/api', require('./modules/checkout/marketplaceCheckoutRoutes'));
app.use('/api', require('./modules/checkout/storefrontCheckoutRoutes'));
app.use('/api/admin/operations', require('./modules/admin/platformOperationsRoutes'));
app.use('/ecommerce/stats', require('./modules/stats/ecommerceStatsRoutes'));
app.use('/api/categories', require('./modules/catalog/categoryRoutes'));
app.use('/api/auth', require('./modules/auth/authRoutes'));
app.use('/api/customer', require('./modules/customers/customerRoutes'));
app.use('/api/product', require('./modules/catalog/productRoutes'));
app.use('/api/cart', require('./modules/cart/cartRoutes'));
app.use('/api/invoice', require('./modules/invoices/invoiceRoutes'));
app.use('/api/merchant', require('./modules/orders/merchantRoutes'));
app.use('/api/payment', require('./modules/payments/paymentRoutes'));
app.use('/api/order', require('./modules/orders/orderRoutes'));
app.use('/api', require('./modules/notifications/notificationRoutes'));
app.use("/api/payment-config", require('./modules/payments/paymentConfig'));
app.use("/api/ops", require("./modules/ops/opsRoutes"));
app.use("/api/usage", require("./modules/billing/usageRoutes"));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    message: err.message || 'Internal server error',
  });
});

module.exports = app;
