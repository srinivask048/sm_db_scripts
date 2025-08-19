#!/bin/bash

# Install dependencies
npm install node-cron

# Create backup directory
mkdir -p ./db-backups

# Set up environment variables for each machine
echo "GITHUB_REPO=your-username/sm-db-scripts" >> .env
echo "BACKUP_DIR=./db-backups" >> .env
echo "GITHUB_DIR=./sm-db-scripts" >> .env

# Set up git credentials (run this on each machine)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Create systemd service for auto-start (Linux)
sudo tee /etc/systemd/system/sm-db-scheduler.service > /dev/null <<EOF
[Unit]
Description=SM Database Scheduler
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/node $(pwd)/scripts/scheduler.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
sudo systemctl enable sm-db-scheduler
sudo systemctl start sm-db-scheduler