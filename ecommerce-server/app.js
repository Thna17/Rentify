const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const cors = require('cors');
const cookieParser = require('cookie-parser');

const helmetConfig = require('./config/helmetConfig');
const corsOptions = require('./config/corsConfig');
const sessionConfig = require('./config/sessionConfig');
const sessionMiddleware = require('./middlewares/sessionMiddleware');
const correlationMiddleware = require('./middlewares/correlation');
const { logger, getCorrelationId } = require('./utils/logger');
// const TelegramService = require('./modules/notifications/telegramService');

const app = express();

// Middleware
app.use(correlationMiddleware);
app.use(helmetConfig);
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  },
}));
app.use(cookieParser(process.env.COOKIE_SECRET || 'default'));
app.use(sessionConfig);
app.use(sessionMiddleware);

const { getReadinessReport } = require('./modules/health');

// Container and load-balancer probes.
// Liveness probe: lightweight signal answering whether the process is alive.
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

// Readiness probe: deep dependency check answering whether traffic can be served safely.
app.get('/ready', async (_req, res) => {
  const { statusCode, payload } = await getReadinessReport();
  return res.status(statusCode).json(payload);
});

// Setup Telegram webhook
// TelegramService.setupWebhook(app);

// Your routes
app.use('/api/website-data', require('./modules/websites/websiteRoutes'));
app.use('/api/store-access', require('./modules/store-access/storeAccessRoutes'));
app.use('/api', require('./modules/store-catalog/storeCatalogRoutes'));
app.use('/api', require('./modules/orders/storePosRoutes'));
app.use('/api', require('./modules/invoices/invoiceRoutes'));
app.use('/api', require('./modules/checkout/marketplaceCheckoutRoutes'));
app.use('/api', require('./modules/checkout/storefrontCheckoutRoutes'));
app.use('/api/admin/operations', require('./modules/admin/platformOperationsRoutes'));
app.use('/api/analytics', require('./modules/analytics/analyticsRoutes'));
app.use('/ecommerce/stats', require('./modules/stats/ecommerceStatsRoutes'));
app.use('/api/categories', require('./modules/catalog/categoryRoutes'));
app.use('/api/auth', require('./modules/auth/authRoutes'));
app.use('/api/customer', require('./modules/customers/customerRoutes'));
app.use('/api/product', require('./modules/catalog/productRoutes'));
app.use('/api/cart', require('./modules/checkout/marketplaceCartRoutes'));
app.use('/api/cart', require('./modules/cart/cartRoutes'));
app.use('/api/invoice', require('./modules/invoices/invoiceRoutes'));
app.use('/api/merchant', require('./modules/orders/merchantRoutes'));
app.use('/api/payment', require('./modules/payments/paymentRoutes'));

// ABA PayWay (retired for Release 1 checkout per DEC-029; unmounted, code preserved inactive)
// app.use('/api/payments/aba-payway', require('./modules/payments/aba/abaPaywayRoutes'));
app.use('/api/order', require('./modules/orders/orderRoutes'));
app.use('/api', require('./modules/notifications/notificationRoutes'));
app.use("/api/payment-config", require('./modules/payments/paymentConfig'));
app.use("/api/ops", require("./modules/ops/opsRoutes"));
app.use("/api/usage", require("./modules/billing/usageRoutes"));

// Error handler
const errorHandler = require('./middlewares/errorHandler');
app.use(errorHandler);

module.exports = app;
