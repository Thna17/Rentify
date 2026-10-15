const app = require('./app');
const syncDB = require('./config/initDb');

const startDeploymentListener = require('./modules/websites/DeploymentListener');

const startServer = async () => {
  await syncDB();

  // Start Redis Listener
  startDeploymentListener();

  // Start Recovery Watchdog
  require('./modules/payments/recoveryWorker').start();
  require('./modules/billing/billingWorker').start();

  const port = process.env.PORT || 4000;
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
  });

  process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION:', err);
    server.close(() => process.exit(1));
  });
};

startServer();
