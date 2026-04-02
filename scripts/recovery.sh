#!/bin/bash

# CivilCOPZ Disaster Recovery Script
# This script restores the application from backups

set -e

# Configuration
APP_NAME="civilcopz"
BACKUP_ROOT="/var/backups/$APP_NAME"
APP_DIR="/var/app/$APP_NAME"
LOG_FILE="/var/log/$APP_NAME/recovery.log"
TIMESTAMP=${1:-latest}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}" | tee -a "$LOG_FILE"
}

# Find backup directory
find_backup() {
    if [ "$TIMESTAMP" = "latest" ]; then
        BACKUP_DIR=$(find "$BACKUP_ROOT" -maxdepth 1 -type d -name "20*" | sort | tail -1)
    else
        BACKUP_DIR="$BACKUP_ROOT/$TIMESTAMP"
    fi

    if [ ! -d "$BACKUP_DIR" ]; then
        error "Backup directory not found: $BACKUP_DIR"
    fi

    log "📁 Using backup: $BACKUP_DIR"
}

# Validate backup integrity
validate_backup() {
    log "🔍 Validating backup integrity..."

    # Check manifest
    if [ ! -f "$BACKUP_DIR/manifest.txt" ]; then
        warning "Manifest file missing"
    fi

    # Check database backup
    if [ ! -f "$BACKUP_DIR/database.backup" ]; then
        error "Database backup file missing"
    fi

    # Check application backup
    if [ ! -f "$BACKUP_DIR/application.tar.gz" ]; then
        error "Application backup file missing"
    fi

    # Verify file sizes
    DB_SIZE=$(stat -f%z "$BACKUP_DIR/database.backup" 2>/dev/null || stat -c%s "$BACKUP_DIR/database.backup" 2>/dev/null)
    APP_SIZE=$(stat -f%z "$BACKUP_DIR/application.tar.gz" 2>/dev/null || stat -c%s "$BACKUP_DIR/application.tar.gz" 2>/dev/null)

    if [ "$DB_SIZE" -lt 1000 ]; then
        warning "Database backup seems too small: $DB_SIZE bytes"
    fi

    if [ "$APP_SIZE" -lt 1000 ]; then
        warning "Application backup seems too small: $APP_SIZE bytes"
    fi

    success "Backup validation completed"
}

# Stop services
stop_services() {
    log "🛑 Stopping services..."

    # Stop PM2 processes
    pm2 delete all 2>/dev/null || true

    # Stop nginx
    systemctl stop nginx 2>/dev/null || true

    success "Services stopped"
}

# Restore database
restore_database() {
    log "🗄️ Restoring database..."

    # Load environment variables
    if [ -f "$BACKUP_DIR/.env.prod" ]; then
        export $(grep -v '^#' "$BACKUP_DIR/.env.prod" | xargs)
    elif [ -f "/var/app/$APP_NAME/.env.prod" ]; then
        export $(grep -v '^#' "/var/app/$APP_NAME/.env.prod" | xargs)
    fi

    if [ -z "$DATABASE_URL" ]; then
        error "DATABASE_URL not configured"
    fi

    # Create backup of current database
    CURRENT_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    log "Creating pre-recovery backup..."
    pg_dump "$DATABASE_URL" > "/tmp/pre_recovery_$CURRENT_TIMESTAMP.sql" 2>/dev/null || warning "Pre-recovery backup failed"

    # Terminate active connections
    psql "$DATABASE_URL" -c "
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = current_database() AND pid <> pg_backend_pid();
    " 2>/dev/null || warning "Could not terminate active connections"

    # Drop and recreate database
    DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
    psql "$(echo "$DATABASE_URL" | sed 's|/[^/]*$||')" -c "DROP DATABASE IF EXISTS \"$DB_NAME\";" 2>/dev/null || true
    psql "$(echo "$DATABASE_URL" | sed 's|/[^/]*$||')" -c "CREATE DATABASE \"$DB_NAME\";" 2>/dev/null || true

    # Restore from backup
    pg_restore \
        --clean \
        --if-exists \
        --no-owner \
        --no-privileges \
        --dbname="$DATABASE_URL" \
        "$BACKUP_DIR/database.backup"

    success "Database restored successfully"
}

# Restore application files
restore_application() {
    log "📦 Restoring application files..."

    # Create backup of current application
    if [ -d "$APP_DIR" ]; then
        CURRENT_BACKUP="/tmp/app_pre_recovery_$(date +%Y%m%d_%H%M%S)"
        mv "$APP_DIR" "$CURRENT_BACKUP" 2>/dev/null || warning "Could not backup current application"
    fi

    # Create fresh application directory
    mkdir -p "$APP_DIR"
    cd "$APP_DIR"

    # Extract application backup
    tar -xzf "$BACKUP_DIR/application.tar.gz" -C "$APP_DIR"

    # Restore configuration
    if [ -f "$BACKUP_DIR/.env.prod" ]; then
        cp "$BACKUP_DIR/.env.prod" "$APP_DIR/.env.prod"
    fi

    if [ -f "$BACKUP_DIR/ecosystem.config.js" ]; then
        cp "$BACKUP_DIR/ecosystem.config.js" "$APP_DIR/backend/ecosystem.config.js"
    fi

    # Set proper permissions
    chown -R civilcopz:civilcopz "$APP_DIR" 2>/dev/null || true
    chmod -R 755 "$APP_DIR"
    chmod 600 "$APP_DIR/.env.prod" 2>/dev/null || true

    success "Application files restored"
}

# Restore Redis (if backup exists)
restore_redis() {
    if [ -f "$BACKUP_DIR/redis.rdb" ]; then
        log "🔴 Restoring Redis data..."

        systemctl stop redis 2>/dev/null || true

        cp "$BACKUP_DIR/redis.rdb" "/var/lib/redis/dump.rdb"
        chown redis:redis "/var/lib/redis/dump.rdb" 2>/dev/null || true

        systemctl start redis 2>/dev/null || true

        success "Redis data restored"
    fi
}

# Install dependencies
install_dependencies() {
    log "📦 Installing dependencies..."

    cd "$APP_DIR"

    # Install backend dependencies
    cd backend
    npm ci --production=false

    # Install frontend dependencies
    cd ../frontend
    npm ci --production=false

    success "Dependencies installed"
}

# Start services
start_services() {
    log "🚀 Starting services..."

    cd "$APP_DIR/backend"

    # Start with PM2
    pm2 start ecosystem.config.js --env production

    # Start nginx
    systemctl start nginx 2>/dev/null || true

    success "Services started"
}

# Run health checks
run_health_checks() {
    log "🏥 Running health checks..."

    local max_attempts=30
    local attempt=1

    # Wait for backend
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "http://localhost:4000/health" > /dev/null 2>&1; then
            success "Backend health check passed"
            break
        fi

        if [ $attempt -eq $max_attempts ]; then
            error "Backend health check failed after $max_attempts attempts"
        fi

        log "Waiting for backend... ($attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done

    # Test database connection
    cd "$APP_DIR/backend"
    node -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        prisma.\$connect().then(() => {
            console.log('Database connection successful');
            return prisma.\$disconnect();
        }).catch(err => {
            console.error('Database connection failed:', err.message);
            process.exit(1);
        });
    " || error "Database connection test failed"

    success "All health checks passed"
}

# Send recovery notification
send_recovery_notification() {
    if [ -n "$ALERT_EMAIL" ]; then
        SUBJECT="CivilCOPZ Recovery Completed - $(date +%Y-%m-%d)"
        BODY="System recovery completed successfully from backup: $TIMESTAMP\nBackup Location: $BACKUP_DIR\nRecovery Time: $(date)"

        echo -e "$BODY" | mail -s "$SUBJECT" "$ALERT_EMAIL" || warning "Recovery notification failed"
    fi
}

# Main recovery function
main() {
    log "🚨 Starting CivilCOPZ disaster recovery..."
    log "⚠️  WARNING: This will overwrite current data!"

    # Confirm action in interactive mode
    if [ -t 0 ]; then
        read -p "Are you sure you want to proceed with recovery? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            log "Recovery cancelled by user"
            exit 0
        fi
    fi

    find_backup
    validate_backup
    stop_services
    restore_database
    restore_application
    restore_redis
    install_dependencies
    start_services
    run_health_checks
    send_recovery_notification

    success "🎉 Disaster recovery completed successfully!"
    log "📊 Recovery Summary:"
    log "   • Backup Used: $BACKUP_DIR"
    log "   • Services: Restarted"
    log "   • Health: All checks passed"
    log "   • Time: $(date)"
}

# Show usage if no arguments
if [ $# -eq 0 ]; then
    echo "Usage: $0 [timestamp]"
    echo "  timestamp: Specific backup timestamp (YYYYMMDD_HHMMSS) or 'latest'"
    echo "Example: $0 20240101_120000"
    echo "Example: $0 latest"
    exit 1
fi

# Run main function
main "$@"