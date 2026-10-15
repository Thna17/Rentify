const app = require('./app');
const syncDB = require('./config/initDB');
const { startWebsiteSyncJob } = require('./modules/commerce-sync/websiteSyncJob');

const startServer = async () => {
  await syncDB();
  startWebsiteSyncJob();
  const port = process.env.PORT || 3001;
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
  });


  process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION:', err);
    server.close(() => process.exit(1));
  });
};

startServer();
