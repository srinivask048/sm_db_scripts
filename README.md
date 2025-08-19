# sm_db_scripts

This repository contains scripts and utilities for managing and interacting with the SM database. The scripts are designed to automate common database tasks such as migrations, backups, and data analysis.

## Features

- Database migration scripts
- Backup and restore utilities
- Data analysis and reporting tools
- Environment setup scripts
- Automated database synchronization across multiple machines
- GitHub-based backup and restore system

## Getting Started

### Prerequisites

- Node.js 16+ 
- MySQL 8.0+
- Git configured with GitHub access
- Access to the SM database
- Required database drivers (mysql2)

### Installation

Clone the repository:
```bash
git clone https://github.com/your-username/sm-db-scripts.git
cd sm-db-scripts
npm install
```

## Database Sync and Backup System

### Setup

1. **Install the system:**
   ```bash
   npm install
   chmod +x scripts/install.sh
   ./scripts/install.sh
   ```

2. **Configure environment variables in your config file:**
   ```conf
   GITHUB_REPO=your-username/sm-db-scripts
   BACKUP_DIR=./db-backups
   GITHUB_DIR=./sm-db-scripts
   ```

3. **Set up Git credentials on each machine:**
   ```bash
   git config --global user.name "Your Name"
   git config --global user.email "your.email@example.com"
   ```

### Usage

#### Manual Commands

- **Full sync** (pull from GitHub, apply changes, export, push backup):
  ```bash
  npm run db:sync
  ```

- **Pull latest schema** from GitHub only:
  ```bash
  npm run db:pull
  ```

- **Push current database** to GitHub only:
  ```bash
  npm run db:push
  ```

- **Start automated scheduler**:
  ```bash
  npm run scheduler:start
  ```

#### Direct Script Usage

```bash
# Full synchronization
node scripts/dbSync.js sync

# Pull latest schema from GitHub
node scripts/dbSync.js pull

# Push current database backup to GitHub
node scripts/dbSync.js push
```

### Automated Scheduling

The system provides automated scheduling with the following intervals:

- **Daily sync at 2 AM**: Full synchronization (pull, apply, export, push)
- **Hourly backup**: Local database export (without GitHub push)
- **Every 4 hours**: Pull latest schema from GitHub and apply changes

To start the scheduler:
```bash
npm run scheduler:start
```

### System Service Setup (Linux)

For automatic startup on system boot:

```bash
# The install script creates a systemd service
sudo systemctl enable sm-db-scheduler
sudo systemctl start sm-db-scheduler

# Check service status
sudo systemctl status sm-db-scheduler

# View logs
sudo journalctl -u sm-db-scheduler -f
```

### How It Works

1. **Schema Synchronization**: 
   - Pulls the latest SQL schema file from GitHub
   - Applies schema changes to the local database
   - Skips data modification statements to preserve local data

2. **Data Backup**:
   - Uses `mysqldump` to export complete database with data
   - Creates timestamped backup files
   - Stores backups locally and pushes to GitHub

3. **Multi-Machine Sync**:
   - Each machine runs the same sync process
   - Schema changes are propagated from GitHub
   - Local data is preserved while structure stays synchronized

### File Structure

```
sm-db-scripts/
├── scripts/
│   ├── dbSync.js           # Main database sync manager
│   ├── scheduler.js        # Automated scheduling system
│   └── install.sh          # Installation script
├── db-backups/             # Local backup storage
├── sm_db_*.sql             # Database schema and backup files
├── package.json            # Dependencies and scripts
└── README.md              # This file
```

### Troubleshooting

1. **Permission Issues**: Ensure the user has read/write access to backup directories
2. **Git Authentication**: Set up SSH keys or personal access tokens for GitHub
3. **Database Connection**: Verify database credentials in your environment config
4. **MySQL Path**: Ensure `mysqldump` is in your system PATH

### Environment Configuration

The system reads database configuration from your existing environment file:
- `DB_HOST`: Database host
- `DB_U`: Database username  
- `DB_P`: Database password
- `DB_NAME`: Database name
- `DB_PORT`: Database port

### Security Notes

- Database credentials are read from environment files (not stored in code)
- Backup files may contain sensitive data - ensure proper GitHub repository permissions
- Use private repositories for database backups
