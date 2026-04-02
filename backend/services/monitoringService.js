const promClient = require('prom-client');
const responseTime = require('response-time');
const dbManager = require('./databaseManager');
const alertingService = require('./alertingService');
const os = require('os');

// Create a Registry which registers the metrics
const register = new promClient.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'civilcopz-backend'
});

// Enable the collection of default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
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

const aiQueueJobs = new promClient.Gauge({
  name: 'ai_queue_jobs_total',
  help: 'Total number of jobs in AI processing queue',
  labelNames: ['status'] // 'waiting', 'active', 'completed', 'failed'
});

const caseProcessingTime = new promClient.Histogram({
  name: 'case_processing_time_seconds',
  help: 'Time taken to process case creation and AI classification',
  buckets: [1, 5, 10, 30, 60, 300]
});

const fileUploadSize = new promClient.Histogram({
  name: 'file_upload_size_bytes',
  help: 'Size of uploaded files in bytes',
  buckets: [1024, 10240, 102400, 1048576, 5242880, 10485760] // 1KB to 10MB
});

const auditEventsTotal = new promClient.Counter({
  name: 'audit_events_total',
  help: 'Total number of audit events logged',
  labelNames: ['action', 'user_type']
});

// Register all metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(activeConnections);
register.registerMetric(databaseConnections);
register.registerMetric(aiQueueJobs);
register.registerMetric(caseProcessingTime);
register.registerMetric(fileUploadSize);
register.registerMetric(auditEventsTotal);

// Monitoring service class
class MonitoringService {
  constructor() {
    this.startTime = Date.now();
    this.requestCount = 0;
  }

  // Middleware for HTTP request monitoring
  getRequestMonitoringMiddleware() {
    return responseTime((req, res, time) => {
      const duration = time / 1000; // Convert to seconds

      // Record metrics
      httpRequestDuration
        .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
        .observe(duration);

      httpRequestsTotal
        .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
        .inc();

      this.requestCount++;
    });
  }

  // Update active connections
  updateActiveConnections(count) {
    activeConnections.set(count);
  }

  // Update database connection metrics
  async updateDatabaseMetrics() {
    try {
      const health = await dbManager.healthCheck();

      databaseConnections.labels('write').set(health.write ? 1 : 0);

      for (let i = 0; i < health.reads.length; i++) {
        databaseConnections.labels('read').set(health.reads[i] ? 1 : 0);
      }
    } catch (error) {
      console.error('Failed to update database metrics:', error);
    }
  }

  // Update AI queue metrics
  async updateQueueMetrics(queue) {
    try {
      const waiting = await queue.getWaiting();
      const active = await queue.getActive();
      const completed = await queue.getCompleted();
      const failed = await queue.getFailed();

      aiQueueJobs.labels('waiting').set(waiting);
      aiQueueJobs.labels('active').set(active);
      aiQueueJobs.labels('completed').set(completed);
      aiQueueJobs.labels('failed').set(failed);
    } catch (error) {
      console.error('Failed to update queue metrics:', error);
    }
  }

  // Record case processing time
  recordCaseProcessingTime(duration) {
    caseProcessingTime.observe(duration);
  }

  // Record file upload size
  recordFileUploadSize(size) {
    fileUploadSize.observe(size);
  }

  // Record audit events
  recordAuditEvent(action, userType = 'unknown') {
    auditEventsTotal.labels(action, userType).inc();
  }

  // Get metrics endpoint
  getMetricsEndpoint() {
    return async (req, res) => {
      try {
        res.set('Content-Type', register.contentType);
        const metrics = await register.metrics();
        res.end(metrics);
      } catch (error) {
        console.error('Error generating metrics:', error);
        res.status(500).end();
      }
    };
  }

  // Health check endpoint with detailed metrics
  getHealthEndpoint() {
    return async (req, res) => {
      try {
        const health = await dbManager.healthCheck();

        const response = {
          status: health.overall ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
          uptime: Math.floor((Date.now() - this.startTime) / 1000),
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          services: {
            database: {
              write: health.write,
              reads: health.reads,
              overall: health.overall
            }
          },
          metrics: {
            requests_total: this.requestCount,
            memory_usage: process.memoryUsage(),
            node_version: process.version
          }
        };

        const statusCode = health.overall ? 200 : 503;
        res.status(statusCode).json(response);
      } catch (error) {
        console.error('Health check failed:', error);
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: 'Health check failed'
        });
      }
    };
  }

  // System resource monitoring
  async checkSystemResources() {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;

    // CPU usage (simplified)
    let totalIdle = 0, totalTick = 0;
    cpus.forEach(cpu => {
      for (let type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const cpuUsage = 100 - ~~(100 * idle / total);

    // Check thresholds and alert
    await alertingService.alertHighResourceUsage('cpu', cpuUsage);
    await alertingService.alertHighResourceUsage('memory', memoryUsage);

    return {
      cpu: cpuUsage,
      memory: memoryUsage,
      timestamp: new Date().toISOString()
    };
  }

  // Performance monitoring
  async checkPerformanceMetrics() {
    const metrics = await register.getMetricsAsJSON();

    // Check error rates
    const errorMetrics = metrics.find(m => m.name === 'http_requests_total');
    if (errorMetrics) {
      const totalRequests = errorMetrics.values.reduce((sum, v) => sum + v.value, 0);
      const errorRequests = errorMetrics.values
        .filter(v => v.labels.status_code >= '400')
        .reduce((sum, v) => sum + v.value, 0);

      const errorRate = totalRequests > 0 ? errorRequests / totalRequests : 0;
      await alertingService.alertHighErrorRate(errorRate, 'api');
    }

    // Check response times
    const responseTimeMetrics = metrics.find(m => m.name === 'http_request_duration_seconds');
    if (responseTimeMetrics) {
      const p95ResponseTime = this.calculatePercentile(responseTimeMetrics.values, 0.95) * 1000; // Convert to ms
      await alertingService.alertHighResponseTime(p95ResponseTime, 'api');
    }
  }

  // Calculate percentile from histogram buckets
  calculatePercentile(values, percentile) {
    if (!values || values.length === 0) return 0;

    const sorted = values.sort((a, b) => a.value - b.value);
    const index = Math.ceil(percentile * sorted.length) - 1;
    return sorted[index]?.value || 0;
  }

  // Queue monitoring
  async checkQueueHealth(queue) {
    try {
      const waiting = await queue.getWaiting();
      const active = await queue.getActive();

      await alertingService.alertQueueDepth(waiting + active, 'ai_processing');

      return {
        waiting,
        active,
        total: waiting + active
      };
    } catch (error) {
      console.error('Queue health check failed:', error);
      return { waiting: 0, active: 0, total: 0 };
    }
  }

  // Record alert for monitoring
  recordAlert(alert) {
    // Could store alerts in database or send to external monitoring
    console.log('Alert recorded:', alert);
  }

  // Start periodic metrics updates
  startPeriodicUpdates(queue) {
    // Update database metrics every 30 seconds
    setInterval(() => {
      this.updateDatabaseMetrics();
    }, 30000);

    // Update queue metrics every 10 seconds
    if (queue) {
      setInterval(() => {
        this.updateQueueMetrics(queue);
      }, 10000);
    }

    // System resource monitoring every 60 seconds
    setInterval(() => {
      this.checkSystemResources();
    }, 60000);

    // Performance monitoring every 5 minutes
    setInterval(() => {
      this.checkPerformanceMetrics();
    }, 300000);

    // Queue health monitoring every 30 seconds
    if (queue) {
      setInterval(() => {
        this.checkQueueHealth(queue);
      }, 30000);
    }

    console.log('📊 Monitoring service periodic updates started');
  }
}

// Singleton instance
const monitoringService = new MonitoringService();

module.exports = monitoringService;