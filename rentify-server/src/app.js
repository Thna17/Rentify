const express = require('express');
const passport = require('./modules/auth/passport');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const telegramService = require('./modules/notifications/telegramService');
const { getMerchantRedis } = require('./config/redis');

const helmetConfig = require('./config/helmetConfig');
const rateLimiter = require('./config/rateLimiter');
const corsOptions = require('./config/corsConfig');
const sessionConfig = require('./config/sessionConfig');

// Route modules
const authRoutes = require('./modules/auth/authRoutes');
const adminRoute = require('./modules/admin/adminRoute');
const userRoutes = require('./modules/users/userRoutes');
const websiteRoutes = require('./modules/websites/websiteRoutes');
const storeRoutes = require('./modules/stores/storeRoutes');
const deploymentRoutes = require('./modules/deployments/deploymentRoute');
const websiteTemplate = require('./modules/templates/websiteTemplate');
const dashboardRoute = require('./modules/dashboard/dashboardRoute');
const staffRoutes = require('./modules/staff/staffRoutes');
const notificationRoutes = require('./modules/notifications/notificationRoutes');
const paymentRoutes = require('./modules/billing/paymentRoutes');
const packageRoutes = require('./modules/billing/packageRoutes');
const opsRoutes = require('./modules/ops/opsRoutes');
const internalRoutes = require('./modules/internal/internalRoutes');
const correlationMiddleware = require('./middlewares/correlation');
const { logger, getCorrelationId } = require('./utils/logger');
dotenv.config();
const app = express();

// Global middleware
app.use(correlationMiddleware);
app.use(helmetConfig);
// app.use(rateLimiter);
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  },
}));
app.use(cookieParser(process.env.COOKIE_SECRET || 'default'));
app.use(sessionConfig);
app.use(passport.initialize());
app.use(passport.session());
// telegramService.setupWebhook(app);

const { getReadinessReport } = require('./modules/health');

// Container and load-balancer probes.
// Liveness probe: lightweight signal answering whether the process is alive.
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

// Readiness probe: deep dependency check answering whether traffic can be served safely.
app.get('/ready', async (_req, res) => {
  const { statusCode, payload } = await getReadinessReport();
  return res.status(statusCode).json(payload);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/admin', adminRoute);
app.use('/api/user', userRoutes);
app.use('/api/websites', websiteRoutes);
app.use('/api/stores', storeRoutes);
app.use('/templates', websiteTemplate);
app.use('/api/deployments', deploymentRoutes);
app.use('/dashboard', dashboardRoute);
app.use('/api/staff', staffRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/packages', packageRoutes)
app.use('/ops', opsRoutes);
app.use('/api/internal', internalRoutes);

// Add at startup
async function initializeRedis() {
  try {
    await getMerchantRedis();
    console.log('Merchant Redis initialized');
  } catch (error) {
    console.error('Failed to initialize Redis:', error);
  }
}

initializeRedis();

// Error handling
const errorHandler = require('./middlewares/errorHandler');
app.use(errorHandler);

module.exports = app;
