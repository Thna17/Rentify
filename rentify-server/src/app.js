const express = require('express');
const passport = require('./config/passport');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const telegramService = require('./services/telegramService');
const { getMerchantRedis } = require('./config/redis');

const helmetConfig = require('./config/helmetConfig');
const rateLimiter = require('./config/rateLimiter');
const corsOptions = require('./config/corsConfig');
const sessionConfig = require('./config/sessionConfig');

// Route modules
const authRoutes = require('./routes/authRoutes');
const adminRoute = require('./routes/adminRoute');
const userRoutes = require('./routes/userRoutes');
const websiteRoutes = require('./routes/websiteRoutes');
const storeRoutes = require('./routes/storeRoutes');
const deploymentRoutes = require('./routes/deploymentRoute');
const websiteTemplate = require('./routes/websiteTemplate');
const dashboardRoute = require('./routes/dashboardRoute');
const staffRoutes = require('./routes/staffRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const packageRoutes = require('./routes/packageRoutes');
const opsRoutes = require('./routes/opsRoutes');
const internalRoutes = require('./routes/internalRoutes');
dotenv.config();
const app = express();

// Global middleware
app.use(helmetConfig);
// app.use(rateLimiter);
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET || 'default'));
app.use(sessionConfig);
app.use(passport.initialize());
app.use(passport.session());
// telegramService.setupWebhook(app);

// Container and load-balancer health probe. It intentionally reveals no
// tenant or dependency details.
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

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
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    message: err.message || 'Internal server error',
  });
});

module.exports = app;
