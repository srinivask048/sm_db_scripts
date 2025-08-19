const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const { execSync } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: process.env.ENV_CONFIG_PATH });

class DatabaseSyncManager {
  constructor() {
    this.dbConfig = this.loadDbConfig();
    this.githubRepo = process.env.GITHUB_REPO || 'your-username/sm-db-scripts';
    this.backupDir = process.env.BACKUP_DIR || './db-backups';
    this.githubDir = process.env.GITHUB_DIR || './sm-db-scripts';
  }

  loadDbConfig() {
    const configPath = process.env.ENV_CONFIG_PATH;
    const configContent = require('fs').readFileSync(configPath, 'utf8');
    const config = {};
    
    configContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        config[key.trim()] = value.trim();
      }
    });

    return {
      host: config.DB_HOST,
      user: config.DB_U,
      password: config.DB_P,
      database: config.DB_NAME,
      port: parseInt(config.DB_PORT)
    };
  }

  async createConnection() {
    return await mysql.createConnection(this.dbConfig);
  }

  async pullLatestFromGithub() {
    try {
      console.log('Pulling latest database schema from GitHub...');
      
      // Clone or pull the repository
      if (!require('fs').existsSync(this.githubDir)) {
        execSync(`git clone https://github.com/${this.githubRepo}.git ${this.githubDir}`);
      } else {
        execSync(`cd ${this.githubDir} && git pull origin main`);
      }
      
      console.log('Successfully pulled latest changes from GitHub');
      return true;
    } catch (error) {
      console.error('Error pulling from GitHub:', error.message);
      return false;
    }
  }

  async getLatestSchemaFile() {
    const schemaFiles = await fs.readdir(this.githubDir);
    const sqlFiles = schemaFiles.filter(file => file.endsWith('.sql'));
    
    // Sort by modification time or use the most recent one
    if (sqlFiles.length > 0) {
      return path.join(this.githubDir, sqlFiles[sqlFiles.length - 1]);
    }
    
    throw new Error('No SQL schema file found in repository');
  }

  async syncDatabaseFromSchema() {
    try {
      const connection = await this.createConnection();
      const schemaFile = await this.getLatestSchemaFile();
      const sqlContent = await fs.readFile(schemaFile, 'utf8');
      
      console.log('Applying database schema updates...');
      
      // Split SQL statements and execute them
      const statements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.toUpperCase().includes('INSERT') || 
            statement.toUpperCase().includes('UPDATE') ||
            statement.toUpperCase().includes('DELETE')) {
          // Skip data modification statements for now, only apply schema changes
          continue;
        }
        
        try {
          await connection.execute(statement);
        } catch (error) {
          if (!error.message.includes('already exists')) {
            console.error(`Error executing statement: ${statement.substring(0, 100)}...`);
            console.error(error.message);
          }
        }
      }
      
      await connection.end();
      console.log('Database schema sync completed');
      return true;
    } catch (error) {
      console.error('Error syncing database:', error.message);
      return false;
    }
  }

  async exportDatabaseToFile() {
    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
      const filename = `sm_db_${timestamp}.sql`;
      const filepath = path.join(this.backupDir, filename);
      
      // Ensure backup directory exists
      await fs.mkdir(this.backupDir, { recursive: true });
      
      console.log('Exporting database to file...');
      
      // Use mysqldump to export the database
      const dumpCommand = `mysqldump -h ${this.dbConfig.host} -P ${this.dbConfig.port} -u ${this.dbConfig.user} -p${this.dbConfig.password} ${this.dbConfig.database} --routines --triggers --single-transaction > ${filepath}`;
      
      execSync(dumpCommand);
      
      console.log(`Database exported to: ${filepath}`);
      return filepath;
    } catch (error) {
      console.error('Error exporting database:', error.message);
      throw error;
    }
  }

  async pushToGithub(filepath) {
    try {
      const filename = path.basename(filepath);
      const targetPath = path.join(this.githubDir, filename);
      
      // Copy the backup file to the git repository
      await fs.copyFile(filepath, targetPath);
      
      console.log('Pushing backup to GitHub...');
      
      // Add, commit, and push to GitHub
      execSync(`cd ${this.githubDir} && git add ${filename}`);
      execSync(`cd ${this.githubDir} && git commit -m "Automated database backup - ${new Date().toISOString()}"`);
      execSync(`cd ${this.githubDir} && git push origin main`);
      
      console.log('Successfully pushed backup to GitHub');
      return true;
    } catch (error) {
      console.error('Error pushing to GitHub:', error.message);
      return false;
    }
  }

  async syncTables() {
    try {
      const connection = await this.createConnection();
      
      // Get the list of tables to sync
      const tables = ['holdings_list', 'watch_list', 'symbol_info', 'sold_list'];
      
      console.log('Syncing table data...');
      
      for (const table of tables) {
        await this.syncTableData(connection, table);
      }
      
      await connection.end();
      console.log('Table data sync completed');
    } catch (error) {
      console.error('Error syncing tables:', error.message);
    }
  }

  async syncTableData(connection, tableName) {
    try {
      // This is a simplified sync - you might want to implement more sophisticated logic
      // based on timestamps or checksums
      console.log(`Syncing ${tableName}...`);
      
      // For now, we'll just log the count - implement your sync logic here
      const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
      console.log(`${tableName}: ${rows[0].count} records`);
      
    } catch (error) {
      console.error(`Error syncing ${tableName}:`, error.message);
    }
  }

  async fullSync() {
    console.log('Starting full database sync...');
    
    // 1. Pull latest schema from GitHub
    const pullSuccess = await this.pullLatestFromGithub();
    if (!pullSuccess) {
      console.error('Failed to pull from GitHub, aborting sync');
      return;
    }
    
    // 2. Apply schema updates to local database
    await this.syncDatabaseFromSchema();
    
    // 3. Sync table data
    await this.syncTables();
    
    // 4. Export current database state
    const backupPath = await this.exportDatabaseToFile();
    
    // 5. Push backup to GitHub
    await this.pushToGithub(backupPath);
    
    console.log('Full sync completed successfully!');
  }
}

module.exports = DatabaseSyncManager;

// CLI usage
if (require.main === module) {
  const syncManager = new DatabaseSyncManager();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'pull':
      syncManager.pullLatestFromGithub();
      break;
    case 'push':
      syncManager.exportDatabaseToFile()
        .then(filepath => syncManager.pushToGithub(filepath));
      break;
    case 'sync':
      syncManager.fullSync();
      break;
    default:
      console.log('Usage: node dbSync.js [pull|push|sync]');
  }
}