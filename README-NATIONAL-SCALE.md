# CivilCOPZ National Scale Deployment

## Overview

CivilCOPZ is a comprehensive grievance management platform designed to handle India's consumer protection ecosystem at national scale. This deployment configuration provides enterprise-grade infrastructure with horizontal scaling, monitoring, and high availability.

## Architecture

### Core Components

- **Database Layer**: PostgreSQL with read replicas for horizontal scaling
- **Cache Layer**: Redis cluster with master-replica configuration
- **Application Layer**: Multiple Node.js backend instances with load balancing
- **AI Processing**: Dedicated AI worker service for case classification
- **Load Balancing**: Nginx reverse proxy with health checks and rate limiting
- **Monitoring**: Prometheus metrics collection with Grafana dashboards

### Scaling Capabilities

- **Database**: 1 primary + 2 read replicas (expandable)
- **Cache**: 1 Redis master + 2 replicas (expandable)
- **Backend**: 3 API instances (auto-scalable)
- **Load Balancer**: Single point of entry with health checks

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 16GB+ RAM recommended
- 100GB+ storage for databases and logs
- Linux/Windows/Mac with Docker support

## Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env.prod.example .env.prod

# Edit with your actual values
nano .env.prod
```

### 2. Deploy

```bash
# Make deployment script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

### 3. Verify Deployment

```bash
# Check service health
curl http://localhost/health

# View Grafana dashboard
open http://localhost:3000

# Check Prometheus metrics
open http://localhost:9090
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DB_PASSWORD` | PostgreSQL password | Yes |
| `JWT_SECRET` | JWT signing secret (256-bit) | Yes |
| `OPENAI_API_KEY` | OpenAI API key | Yes |
| `AZURE_AI_ENDPOINT` | Azure AI endpoint | Yes |
| `AZURE_AI_KEY` | Azure AI key | Yes |
| `GRAFANA_ADMIN_PASSWORD` | Grafana admin password | Yes |

### SSL Configuration

For production HTTPS:

```bash
# Place certificates in nginx/ssl/
nginx/ssl/civilcopz.crt
nginx/ssl/civilcopz.key
```

## Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| Application | `http://localhost` | Main application |
| Health Check | `http://localhost/health` | Service health status |
| Metrics | `http://localhost/metrics` | Prometheus metrics |
| Grafana | `http://localhost:3000` | Monitoring dashboard |
| Prometheus | `http://localhost:9090` | Metrics collection |

## Monitoring & Observability

### Key Metrics

- **API Performance**: Response times, request rates, error rates
- **Database**: Connection pools, query performance, replication lag
- **Cache**: Hit rates, memory usage, eviction rates
- **AI Processing**: Queue depth, processing times, success rates
- **System**: CPU, memory, disk usage across all services

### Grafana Dashboards

Pre-configured dashboards include:
- API Response Time & Request Rate
- Database Connection Monitoring
- Redis Memory Usage
- AI Queue Processing Status
- System Health Overview

## Scaling Operations

### Horizontal Scaling

```bash
# Scale backend services
docker-compose -f docker-compose.prod.yml up -d --scale backend-1=2 --scale backend-2=2 --scale backend-3=2

# Add more database replicas
docker-compose -f docker-compose.prod.yml up -d postgres-replica-3 postgres-replica-4
```

### Vertical Scaling

```bash
# Increase resource limits
docker-compose -f docker-compose.prod.yml up -d \
  --scale backend-1=1 \
  -e BACKEND_MEMORY=2g \
  -e BACKEND_CPU=2
```

## Backup & Recovery

### Database Backup

```bash
# Create database backup
docker-compose -f docker-compose.prod.yml exec postgres-primary pg_dump -U civilcopz_user civilcopz > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup Redis data
docker-compose -f docker-compose.prod.yml exec redis-master redis-cli --rdb backup.rdb
```

### Recovery

```bash
# Restore database
docker-compose -f docker-compose.prod.yml exec -T postgres-primary psql -U civilcopz_user civilcopz < backup.sql

# Restore Redis
docker-compose -f docker-compose.prod.yml exec redis-master redis-cli --rdb restore.rdb
```

## Troubleshooting

### Common Issues

1. **Service Startup Failures**
   ```bash
   # Check logs
   docker-compose -f docker-compose.prod.yml logs <service-name>

   # Restart specific service
   docker-compose -f docker-compose.prod.yml restart <service-name>
   ```

2. **Database Connection Issues**
   ```bash
   # Check database health
   docker-compose -f docker-compose.prod.yml exec postgres-primary pg_isready -U civilcopz_user -d civilcopz

   # Reset connections
   docker-compose -f docker-compose.prod.yml restart postgres-primary
   ```

3. **High Memory Usage**
   ```bash
   # Check resource usage
   docker stats

   # Scale down if needed
   docker-compose -f docker-compose.prod.yml up -d --scale backend-1=1
   ```

### Health Checks

```bash
# Individual service health
curl http://localhost/health

# Database connectivity
docker-compose -f docker-compose.prod.yml exec backend-1 npm run health:db

# Redis connectivity
docker-compose -f docker-compose.prod.yml exec backend-1 npm run health:redis
```

## Security Considerations

### Production Security

- **SSL/TLS**: Configure certificates for HTTPS
- **Firewall**: Restrict access to necessary ports only
- **Secrets**: Use Docker secrets or external secret management
- **Updates**: Regularly update base images and dependencies
- **Monitoring**: Set up alerts for security events

### Network Security

```bash
# Internal network only
networks:
  civilcopz-network:
    internal: true
```

## Performance Optimization

### Database Optimization

- Connection pooling configured
- Read/write splitting implemented
- Query optimization and indexing
- Regular maintenance and vacuuming

### Cache Optimization

- Multi-layer caching (memory + Redis)
- TTL-based expiration
- Cache warming strategies
- Memory limits and eviction policies

### Application Optimization

- Horizontal scaling with load balancing
- Request queuing for AI processing
- Background job processing
- Resource limits and health checks

## Maintenance

### Regular Tasks

```bash
# Update images
docker-compose -f docker-compose.prod.yml pull

# Rotate logs
docker-compose -f docker-compose.prod.yml exec backend-1 logrotate /etc/logrotate.d/app

# Database maintenance
docker-compose -f docker-compose.prod.yml exec postgres-primary vacuumdb -U civilcopz_user -d civilcopz --analyze
```

### Monitoring Alerts

Set up alerts for:
- High error rates (>5%)
- Database connection pool exhaustion
- Redis memory usage >80%
- AI queue depth >1000
- Response time >2 seconds

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review service logs
3. Verify configuration
4. Check system resources
5. Contact the development team

## License

This deployment configuration is part of the CivilCOPZ platform.