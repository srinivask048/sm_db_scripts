const cron = require('node-cron');
const DatabaseSyncManager = require('./dbSync');

class DatabaseScheduler {
  constructor() {
    this.syncManager = new DatabaseSyncManager();
  }

  start() {
    console.log('Starting database sync scheduler...');
    
    // Daily sync at 2 AM
    cron.schedule('0 2 * * *', async () => {
      console.log('Running scheduled database sync...');
      await this.syncManager.fullSync();
    });

    // Hourly backup (without GitHub push)
    cron.schedule('0 * * * *', async () => {
      console.log('Running hourly backup...');
      await this.syncManager.exportDatabaseToFile();
    });

    // Pull latest from GitHub every 4 hours
    cron.schedule('0 */4 * * *', async () => {
      console.log('Pulling latest schema from GitHub...');
      await this.syncManager.pullLatestFromGithub();
      await this.syncManager.syncDatabaseFromSchema();
    });

    console.log('Scheduler started successfully!');
  }
}

// Start the scheduler
if (require.main === module) {
  const scheduler = new DatabaseScheduler();
  scheduler.start();
  
  // Keep the process running
  process.on('SIGINT', () => {
    console.log('Shutting down scheduler...');
    process.exit(0);
  });
}

module.exports = DatabaseScheduler;