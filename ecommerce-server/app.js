const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const cors = require('cors');
const cookieParser = require('cookie-parser');

const helmetConfig = require('./config/helmetConfig');
const corsOptions = require('./config/corsConfig');
const sessionConfig = require('./config/sessionConfig');
// const TelegramService = require('./services/telegramService');

const app = express();

// Middleware
app.use(helmetConfig);
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET || 'default'));
app.use(sessionConfig);

// Container and load-balancer health probe. It intentionally reveals no
// tenant or payment-provider details.
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

// Setup Telegram webhook
// TelegramService.setupWebhook(app);

// Your routes
app.use('/api/website-data', require('./routes/websiteRoutes'));
app.use('/api/store-access', require('./routes/storeAccessRoutes'));
app.use('/api', require('./routes/storeCatalogRoutes'));
app.use('/api', require('./routes/marketplaceCheckoutRoutes'));
app.use('/api', require('./routes/storefrontCheckoutRoutes'));
app.use('/ecommerce/stats', require('./routes/ecommerceStatsRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/customer', require('./routes/customerRoutes'));
app.use('/api/product', require('./routes/productRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/invoice', require('./routes/invoiceRoutes'));
app.use('/api/merchant', require('./routes/merchantRoutes'));
app.use('/api/payment', require('./routes/paymentRoutes'));
app.use('/api/order', require('./routes/orderRoutes'));
app.use('/api', require('./routes/notificationRoutes'));
app.use("/api/payment-config", require('./routes/paymentConfig'));
app.use("/api/ops", require("./routes/opsRoutes"));
app.use("/api/usage", require("./routes/usageRoutes"));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    message: err.message || 'Internal server error',
  });
});

module.exports = app;
