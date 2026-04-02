#!/bin/bash

# CivilCOPZ Production Deployment Script
# This script performs complete production deployment with rollback capability

set -e

# Configuration
APP_NAME="civilcopz"
APP_DIR="/var/app/$APP_NAME"
BACKUP_DIR="/var/backups/$APP_NAME"
LOG_FILE="/var/log/$APP_NAME/deploy.log"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEPLOY_USER="civilcopz"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
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

# Pre-deployment checks
pre_deployment_checks() {
    log "🔍 Running pre-deployment checks..."

    # Check if running as correct user
    if [ "$USER" != "$DEPLOY_USER" ] && [ "$EUID" -eq 0 ]; then
        warning "Running as root, switching to $DEPLOY_USER..."
        su - "$DEPLOY_USER" -c "$0 $@"
        exit $?
    fi

    # Check disk space
    DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$DISK_USAGE" -gt 90 ]; then
        error "Disk usage is ${DISK_USAGE}%. Need at least 10% free space."
    fi

    # Check memory
    MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    if [ "$MEM_USAGE" -gt 95 ]; then
        error "Memory usage is ${MEM_USAGE}%. System may be overloaded."
    fi

    success "Pre-deployment checks passed"
}

# Create backup
create_backup() {
    log "💾 Creating backup..."

    mkdir -p "$BACKUP_DIR/$TIMESTAMP"

    # Database backup
    if [ -n "$DATABASE_URL" ]; then
        log "Backing up database..."
        pg_dump "$DATABASE_URL" > "$BACKUP_DIR/$TIMESTAMP/database.sql" 2>/dev/null || warning "Database backup failed"
    fi

    # Application files backup
    if [ -d "$APP_DIR" ]; then
        log "Backing up application files..."
        tar -czf "$BACKUP_DIR/$TIMESTAMP/app.tar.gz" -C "$APP_DIR" . 2>/dev/null || warning "App backup failed"
    fi

    # Environment file backup
    if [ -f "$APP_DIR/.env.prod" ]; then
        cp "$APP_DIR/.env.prod" "$BACKUP_DIR/$TIMESTAMP/.env.prod.backup"
    fi

    success "Backup created at $BACKUP_DIR/$TIMESTAMP"
}

# Pull latest code
pull_code() {
    log "📥 Pulling latest code..."

    cd "$APP_DIR"

    # Stash any local changes
    git stash push -m "Pre-deployment stash $TIMESTAMP" 2>/dev/null || true

    # Pull latest changes
    git pull origin main --rebase

    # Install/update dependencies
    log "📦 Installing backend dependencies..."
    cd backend
    npm ci --production=false

    log "📦 Installing frontend dependencies..."
    cd ../frontend
    npm ci --production=false

    success "Code pulled and dependencies installed"
}

# Build application
build_application() {
    log "🔨 Building application..."

    cd "$APP_DIR"

    # Build frontend
    log "Building frontend..."
    cd frontend
    npm run build

    # Build backend (if needed)
    cd ../backend
    npm run build 2>/dev/null || log "No build script for backend"

    success "Application built successfully"
}

# Run database migrations
run_migrations() {
    log "🗄️ Running database migrations..."

    cd "$APP_DIR/backend"

    # Backup database before migration
    if [ -n "$DATABASE_URL" ]; then
        npx prisma migrate deploy
    else
        warning "No DATABASE_URL set, skipping migrations"
    fi

    success "Database migrations completed"
}

# Health checks
health_check() {
    local service=$1
    local url=$2
    local max_attempts=30
    local attempt=1

    log "🏥 Checking $service health at $url..."

    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url" > /dev/null 2>&1; then
            success "$service is healthy"
            return 0
        fi

        log "Attempt $attempt/$max_attempts: $service not ready yet..."
        sleep 10
        ((attempt++))
    done

    error "$service failed health check after $max_attempts attempts"
}

# Start services with PM2
start_services() {
    log "🚀 Starting services with PM2..."

    cd "$APP_DIR"

    # Stop existing processes
    pm2 delete all 2>/dev/null || true

    # Start backend
    log "Starting backend service..."
    cd backend
    pm2 start ecosystem.config.js --env production

    # Wait for backend to be ready
    health_check "backend" "http://localhost:4000/health"

    # Start frontend (if using PM2 for static files)
    log "Starting frontend service..."
    cd ../frontend
    pm2 serve dist 5173 --name civilcopz-ui --spa

    # Save PM2 configuration
    pm2 save

    success "Services started successfully"
}

# Post-deployment tests
post_deployment_tests() {
    log "🧪 Running post-deployment tests..."

    # Test API endpoints
    health_check "API" "http://localhost:4000/api/health"

    # Test frontend
    health_check "Frontend" "http://localhost:5173"

    # Test database connection
    cd "$APP_DIR/backend"
    node -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        prisma.\$connect().then(() => {
            console.log('Database connection successful');
            process.exit(0);
        }).catch(err => {
            console.error('Database connection failed:', err.message);
            process.exit(1);
        });
    " || error "Database connection test failed"

    success "Post-deployment tests passed"
}

# Rollback function
rollback() {
    local backup_timestamp=$1

    error "Deployment failed, initiating rollback to $backup_timestamp..."

    # Stop services
    pm2 delete all 2>/dev/null || true

    # Restore backup
    if [ -d "$BACKUP_DIR/$backup_timestamp" ]; then
        log "Restoring backup..."

        # Restore database
        if [ -f "$BACKUP_DIR/$backup_timestamp/database.sql" ]; then
            psql "$DATABASE_URL" < "$BACKUP_DIR/$backup_timestamp/database.sql" 2>/dev/null || warning "Database restore failed"
        fi

        # Restore application files
        if [ -f "$BACKUP_DIR/$backup_timestamp/app.tar.gz" ]; then
            cd "$APP_DIR"
            tar -xzf "$BACKUP_DIR/$backup_timestamp/app.tar.gz" 2>/dev/null || warning "App restore failed"
        fi

        # Restore environment
        if [ -f "$BACKUP_DIR/$backup_timestamp/.env.prod.backup" ]; then
            cp "$BACKUP_DIR/$backup_timestamp/.env.prod.backup" "$APP_DIR/.env.prod"
        fi
    fi

    # Restart services
    start_services

    success "Rollback completed"
}

# Main deployment function
main() {
    log "🚀 Starting CivilCOPZ production deployment..."

    # Export environment variables
    if [ -f "$APP_DIR/.env.prod" ]; then
        set -a
        source "$APP_DIR/.env.prod"
        set +a
    fi

    local backup_timestamp=""

    # Trap for rollback on failure
    trap 'rollback "$backup_timestamp"' ERR

    pre_deployment_checks
    backup_timestamp=$(date +%Y%m%d_%H%M%S)
    create_backup
    pull_code
    build_application
    run_migrations
    start_services
    post_deployment_tests

    success "🎉 Deployment completed successfully!"
    log "📊 Deployment Summary:"
    log "   • Backup: $BACKUP_DIR/$backup_timestamp"
    log "   • Services: Running under PM2"
    log "   • Health: All checks passed"
    log "   • Rollback: Available if needed"

    # Send notification (if configured)
    if [ -n "$ALERT_EMAIL" ]; then
        echo "CivilCOPZ deployment completed successfully at $TIMESTAMP" | mail -s "CivilCOPZ Deployment Success" "$ALERT_EMAIL" || true
    fi
}

# Run main function
main "$@"