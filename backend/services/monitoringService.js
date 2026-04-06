const promClient = require('prom-client');
const responseTime = require('response-time');
const dbManager = require('./databaseManager');
const alertingService = require('./alertingService');
const os = require('os');
const resilienceService = require('./resilienceService');

// Create a Registry which registers the metrics
const register = new promClient.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'civilcopz-backend'
});

// Enable the collection of default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics (Operations-Grade)
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
});

const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

const databaseConnections = new promClient.Gauge({
  name: 'database_connections',
  help: 'Number of database connections',
  labelNames: ['type'] // 'write' or 'read'
});

const databaseFailoversTotal = new promClient.Counter({
  name: 'database_failover_total',
  help: 'Total number of automated database failover events'
});

const failoverDuration = new promClient.Histogram({
  name: 'failover_duration_seconds',
  help: 'Time taken for database promotion and re-fencing',
  buckets: [10, 30, 60, 120, 300]
});

const g2gSuccessRatio = new promClient.Gauge({
  name: 'g2g_success_ratio',
  help: 'Success ratio for e-Daakhil registry submissions (SLO: > 95%)'
});

const circuitBreakerActive = new promClient.Gauge({
  name: 'circuit_breaker_active',
  help: 'Status of the G2G circuit breaker (1 = Tripped, 0 = Healthy)',
  labelNames: ['service']
});

const systemResourceUsage = new promClient.Gauge({
  name: 'system_resource_usage_ratio',
  help: 'System resource usage ratio (0-1)',
  labelNames: ['resource'] // 'cpu', 'memory'
});

// Register metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(activeConnections);
register.registerMetric(databaseConnections);
register.registerMetric(databaseFailoversTotal);
register.registerMetric(failoverDuration);
register.registerMetric(g2gSuccessRatio);
register.registerMetric(circuitBreakerActive);
register.registerMetric(systemResourceUsage);

class MonitoringService {
  constructor() {
    this.startTime = Date.now();
    this.requestCount = 0;
  }

  // Middleware for HTTP request monitoring
  getRequestMonitoringMiddleware() {
    return responseTime((req, res, time) => {
      const duration = time / 1000;
      httpRequestDuration
        .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
        .observe(duration);

      httpRequestsTotal
        .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
        .inc();

      this.requestCount++;
    });
  }

  async updateDatabaseMetrics() {
    try {
      const health = await dbManager.healthCheck();
      databaseConnections.labels('write').set(health.write ? 1 : 0);
      for (let i = 0; i < health.reads.length; i++) {
        databaseConnections.labels('read').set(health.reads[i] ? 1 : 0);
      }
    } catch (e) {
      console.error('Failed to update database metrics:', e);
    }
  }

  getMetricsEndpoint() {
    return async (req, res) => {
      try {
        res.set('Content-Type', register.contentType);
        const metrics = await register.metrics();
        res.end(metrics);
      } catch (error) {
        res.status(500).end();
      }
    };
  }

  getHealthEndpoint() {
    return async (req, res) => {
      try {
        const health = await dbManager.healthCheck();
        const response = {
          status: (health.overall && !resilienceService.isReadOnly()) ? 'healthy' : 'degraded',
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          readOnlyMode: resilienceService.isReadOnly(),
          g2gState: resilienceService.state, // v11.0: Stateful Circuit (CLOSED/OPEN/HALF_OPEN)
          services: {
            database: {
              write: health.write,
              primaryEpoch: dbManager.primaryEpoch, // v11.0: Fencing token visibility
              reads: health.reads,
              overall: health.overall
            },
            registry: {
              activeCircuit: resilienceService.g2gCircuitTripped,
              state: resilienceService.state
            }
          },
        };
        res.status(response.status === 'healthy' ? 200 : 200).json(response); // Return 200 for degraded to allow load balancer inspection
      } catch (error) {
        res.status(503).json({ status: 'unhealthy', error: 'Health check failed' });
      }
    };
  }

  startPeriodicUpdates() {
    setInterval(() => this.updateDatabaseMetrics(), 120000);
    // Track circuit breaker state in Prometheus
    setInterval(() => {
        circuitBreakerActive.labels('g2g').set(resilienceService.g2gCircuitTripped ? 1 : 0);
    }, 60000);
    console.log('📊 Monitoring service periodic updates started (Chaos-Aware)');
  }
}

module.exports = new MonitoringService();
