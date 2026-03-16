#!/bin/bash

# IPL DFS Database Batch Backup Script
# This script performs a complete database backup with logging

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"
LOG_DIR="$PROJECT_DIR/backups/logs"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Log file with timestamp
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="$LOG_DIR/backup_$TIMESTAMP.log"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to log colored messages (terminal only)
log_color() {
    COLOR=$1
    MESSAGE=$2
    echo -e "${COLOR}${MESSAGE}${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $MESSAGE" >> "$LOG_FILE"
}

# Start backup process
log_color "$BLUE" "========================================="
log_color "$BLUE" "IPL DFS - Batch Backup Process"
log_color "$BLUE" "========================================="
log ""
log "Project Directory: $PROJECT_DIR"
log "Log File: $LOG_FILE"
log ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    log_color "$RED" "❌ Error: Node.js is not installed or not in PATH"
    exit 1
fi

# Check if required dependencies exist
if [ ! -d "$PROJECT_DIR/node_modules" ]; then
    log_color "$YELLOW" "⚠️  Warning: node_modules not found. Installing dependencies..."
    cd "$PROJECT_DIR"
    npm install >> "$LOG_FILE" 2>&1
    if [ $? -ne 0 ]; then
        log_color "$RED" "❌ Error: Failed to install dependencies"
        exit 1
    fi
fi

# Run the backup script
log_color "$BLUE" "🔄 Starting backup process..."
log ""

cd "$PROJECT_DIR"
node scripts/batch-backup.js 2>&1 | tee -a "$LOG_FILE"

# Check if backup was successful
if [ ${PIPESTATUS[0]} -eq 0 ]; then
    log ""
    log_color "$GREEN" "========================================="
    log_color "$GREEN" "✅ Backup completed successfully!"
    log_color "$GREEN" "========================================="
    log ""
    log "Log saved to: $LOG_FILE"
    
    # Display recent backups
    log_color "$BLUE" "📂 Recent backups:"
    ls -lht "$PROJECT_DIR/backups/"batch_backup_*.json 2>/dev/null | head -5 | while read line; do
        log "   $line"
    done
    
    exit 0
else
    log ""
    log_color "$RED" "========================================="
    log_color "$RED" "❌ Backup failed!"
    log_color "$RED" "========================================="
    log ""
    log "Check log file for details: $LOG_FILE"
    exit 1
fi
