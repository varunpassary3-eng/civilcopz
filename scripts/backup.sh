#!/bin/bash

# CivilCOPZ Backup Script
# This script creates comprehensive backups of the application and database

set -e

# Configuration
APP_NAME="civilcopz"
BACKUP_ROOT="/var/backups/$APP_NAME"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$BACKUP_ROOT/$TIMESTAMP"
LOG_FILE="/var/log/$APP_NAME/backup.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}" | tee -a "$LOG_FILE"
}

# Create backup directory
create_backup_dir() {
    log "📁 Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
    chmod 700 "$BACKUP_DIR"
}

# Database backup
backup_database() {
    log "🗄️ Backing up PostgreSQL database..."

    # Load environment variables
    if [ -f "/var/app/$APP_NAME/.env.prod" ]; then
        export $(grep -v '^#' "/var/app/$APP_NAME/.env.prod" | xargs)
    fi

    if [ -z "$DATABASE_URL" ]; then
        error "DATABASE_URL not set in .env.prod"
        return 1
    fi

    # Create database dump
    pg_dump "$DATABASE_URL" \
        --no-owner \
        --no-privileges \
        --clean \
        --if-exists \
        --compress=9 \
        --format=custom \
        --file="$BACKUP_DIR/database.backup"

    # Verify backup
    if [ -f "$BACKUP_DIR/database.backup" ]; then
        BACKUP_SIZE=$(du -h "$BACKUP_DIR/database.backup" | cut -f1)
        log "✅ Database backup created: $BACKUP_SIZE"
    else
        error "Database backup failed"
        return 1
    fi
}

# Application files backup
backup_application() {
    log "📦 Backing up application files..."

    APP_DIR="/var/app/$APP_NAME"

    # Exclude patterns
    EXCLUDE_PATTERNS=(
        --exclude='node_modules'
        --exclude='.git'
        --exclude='*.log'
        --exclude='uploads/temp'
        --exclude='.env*'
        --exclude='cache'
    )

    # Create compressed archive
    tar "${EXCLUDE_PATTERNS[@]}" \
        -czf "$BACKUP_DIR/application.tar.gz" \
        -C "$APP_DIR" .

    # Verify backup
    if [ -f "$BACKUP_DIR/application.tar.gz" ]; then
        BACKUP_SIZE=$(du -h "$BACKUP_DIR/application.tar.gz" | cut -f1)
        log "✅ Application backup created: $BACKUP_SIZE"
    else
        error "Application backup failed"
        return 1
    fi
}

# Redis backup (if using persistence)
backup_redis() {
    log "🔴 Backing up Redis data..."

    if [ -f "/var/lib/redis/dump.rdb" ]; then
        cp "/var/lib/redis/dump.rdb" "$BACKUP_DIR/redis.rdb"
        log "✅ Redis backup created"
    else
        warning "Redis persistence not enabled or dump file not found"
    fi
}

# Upload configuration backup
backup_configuration() {
    log "⚙️ Backing up configuration files..."

    CONFIG_FILES=(
        "/var/app/$APP_NAME/.env.prod"
        "/etc/nginx/sites-available/$APP_NAME"
        "/var/app/$APP_NAME/backend/ecosystem.config.js"
    )

    for config_file in "${CONFIG_FILES[@]}"; do
        if [ -f "$config_file" ]; then
            cp "$config_file" "$BACKUP_DIR/$(basename "$config_file")"
        fi
    done

    log "✅ Configuration backup completed"
}

# Upload to S3 (optional)
upload_to_s3() {
    if [ -n "$BACKUP_S3_BUCKET" ] && command -v aws &> /dev/null; then
        log "☁️ Uploading backup to S3..."

        aws s3 cp "$BACKUP_DIR/" "s3://$BACKUP_S3_BUCKET/$TIMESTAMP/" --recursive

        if [ $? -eq 0 ]; then
            log "✅ Backup uploaded to S3"
        else
            warning "S3 upload failed"
        fi
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log "🧹 Cleaning up old backups..."

    # Keep only last 30 days of backups
    find "$BACKUP_ROOT" -type d -mtime +30 -exec rm -rf {} + 2>/dev/null || true

    # Keep only last 10 S3 backups if configured
    if [ -n "$BACKUP_S3_BUCKET" ] && command -v aws &> /dev/null; then
        aws s3 ls "s3://$BACKUP_S3_BUCKET/" | head -n -10 | awk '{print $4}' | \
        xargs -I {} aws s3 rm "s3://$BACKUP_S3_BUCKET/{}" 2>/dev/null || true
    fi

    log "✅ Cleanup completed"
}

# Create backup manifest
create_manifest() {
    log "📋 Creating backup manifest..."

    cat > "$BACKUP_DIR/manifest.txt" << EOF
CivilCOPZ Backup Manifest
=========================
Timestamp: $TIMESTAMP
Server: $(hostname)
Backup Directory: $BACKUP_DIR

Contents:
$(ls -la "$BACKUP_DIR")

System Information:
- OS: $(uname -a)
- Disk Usage: $(df -h / | tail -1)
- Memory: $(free -h | grep '^Mem:' | awk '{print $3 "/" $2}')

Database Info:
- Connection: ${DATABASE_URL:+Configured}
- Size: $(du -sh "$BACKUP_DIR/database.backup" 2>/dev/null | cut -f1 || echo "N/A")

Application Info:
- Version: $(cd "/var/app/$APP_NAME" && git rev-parse HEAD 2>/dev/null || echo "Unknown")
- Size: $(du -sh "$BACKUP_DIR/application.tar.gz" 2>/dev/null | cut -f1 || echo "N/A")

Backup Status: SUCCESS
EOF

    log "✅ Manifest created"
}

# Send notification
send_notification() {
    if [ -n "$ALERT_EMAIL" ]; then
        SUBJECT="CivilCOPZ Backup Completed - $TIMESTAMP"
        BODY="Backup completed successfully at $TIMESTAMP\nLocation: $BACKUP_DIR\nSize: $(du -sh "$BACKUP_DIR" | cut -f1)"

        echo -e "$BODY" | mail -s "$SUBJECT" "$ALERT_EMAIL" || warning "Email notification failed"
    fi
}

# Main backup function
main() {
    log "🚀 Starting CivilCOPZ backup process..."

    # Load environment
    if [ -f "/var/app/$APP_NAME/.env.prod" ]; then
        export $(grep -v '^#' "/var/app/$APP_NAME/.env.prod" | xargs)
    fi

    create_backup_dir
    backup_database
    backup_application
    backup_redis
    backup_configuration
    create_manifest
    upload_to_s3
    cleanup_old_backups
    send_notification

    TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
    log "🎉 Backup completed successfully!"
    log "📊 Backup Summary:"
    log "   • Location: $BACKUP_DIR"
    log "   • Total Size: $TOTAL_SIZE"
    log "   • Timestamp: $TIMESTAMP"
}

# Run main function
main "$@"