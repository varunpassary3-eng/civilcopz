#!/bin/bash

# CivilCOPZ National Scale Production Deployment Script
# This script handles the complete deployment of the CivilCOPZ platform

set -e

echo "🚀 CivilCOPZ National Scale Deployment Script"
echo "=============================================="

# Check if .env.prod exists
if [ ! -f ".env.prod" ]; then
    echo "❌ Error: .env.prod file not found!"
    echo "Please copy .env.prod.example to .env.prod and configure your environment variables."
    exit 1
fi

# Load environment variables
set -a
source .env.prod
set +a

echo "✅ Environment configuration loaded"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command_exists docker; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command_exists docker-compose; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p monitoring/grafana/provisioning/datasources
mkdir -p monitoring/grafana/provisioning/dashboards
mkdir -p monitoring/grafana/dashboards
mkdir -p nginx/ssl
mkdir -p database
mkdir -p redis
mkdir -p backend/uploads

echo "✅ Directories created"

# Build and start services
echo "🐳 Building and starting services..."

# Stop any existing containers
docker-compose -f docker-compose.prod.yml down || true

# Build and start all services
docker-compose -f docker-compose.prod.yml up -d --build

echo "⏳ Waiting for services to be healthy..."

# Wait for database to be ready
echo "Waiting for PostgreSQL primary..."
timeout=300
while ! docker-compose -f docker-compose.prod.yml exec -T postgres-primary pg_isready -U civilcopz_user -d civilcopz >/dev/null 2>&1; do
    if [ $timeout -le 0 ]; then
        echo "❌ Timeout waiting for PostgreSQL primary"
        exit 1
    fi
    timeout=$((timeout-5))
    sleep 5
    echo "Still waiting... ($timeout seconds remaining)"
done

# Wait for Redis to be ready
echo "Waiting for Redis master..."
timeout=120
while ! docker-compose -f docker-compose.prod.yml exec -T redis-master redis-cli ping >/dev/null 2>&1; do
    if [ $timeout -le 0 ]; then
        echo "❌ Timeout waiting for Redis master"
        exit 1
    fi
    timeout=$((timeout-5))
    sleep 5
    echo "Still waiting... ($timeout seconds remaining)"
done

# Wait for backend services to be ready
echo "Waiting for backend services..."
for backend in backend-1 backend-2 backend-3; do
    echo "Waiting for $backend..."
    timeout=180
    while ! docker-compose -f docker-compose.prod.yml exec -T $backend curl -f http://localhost:4000/health >/dev/null 2>&1; do
        if [ $timeout -le 0 ]; then
            echo "❌ Timeout waiting for $backend"
            exit 1
        fi
        timeout=$((timeout-10))
        sleep 10
        echo "Still waiting for $backend... ($timeout seconds remaining)"
    done
    echo "✅ $backend is ready"
done

# Run database migrations (if needed)
echo "🗄️ Running database migrations..."
docker-compose -f docker-compose.prod.yml exec -T backend-1 npm run migrate:prod || echo "Migration completed or not needed"

echo "🎉 Deployment completed successfully!"
echo ""
echo "📊 Service URLs:"
echo "   • Application: http://localhost"
echo "   • Grafana Dashboard: http://localhost:3000 (admin/${GRAFANA_ADMIN_PASSWORD})"
echo "   • Prometheus: http://localhost:9090"
echo "   • Health Check: http://localhost/health"
echo "   • Metrics: http://localhost/metrics"
echo ""
echo "🔧 Management Commands:"
echo "   • View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "   • Stop services: docker-compose -f docker-compose.prod.yml down"
echo "   • Restart services: docker-compose -f docker-compose.prod.yml restart"
echo "   • Scale backend: docker-compose -f docker-compose.prod.yml up -d --scale backend=N"
echo ""
echo "⚠️  Important Notes:"
echo "   • Configure SSL certificates in nginx/ssl/ for production HTTPS"
echo "   • Set up proper firewall rules and security groups"
echo "   • Configure backup strategies for databases"
echo "   • Set up log aggregation and alerting"
echo "   • Monitor resource usage and scale as needed"