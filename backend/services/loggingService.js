const pino = require('pino');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configure Pino logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
}, pino.multistream([
  // Console output for development
  { stream: process.stdout },

  // File output for production
  {
    stream: pino.destination({
      dest: path.join(logsDir, 'app.log'),
      sync: false, // Asynchronous logging
      mkdir: true
    })
  }
]));

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log request
  logger.info({
    type: 'request',
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id || 'anonymous',
    sessionId: req.sessionID || 'no-session'
  }, 'Incoming request');

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

    logger[logLevel]({
      type: 'response',
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length') || 0,
      userId: req.user?.id || 'anonymous'
    }, 'Request completed');
  });

  next();
};

// Performance monitoring middleware
const performanceLogger = (req, res, next) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds

    // Log slow requests (>1000ms)
    if (duration > 1000) {
      logger.warn({
        type: 'performance',
        method: req.method,
        url: req.originalUrl,
        duration: `${duration.toFixed(2)}ms`,
        threshold: '1000ms'
      }, 'Slow request detected');
    }

    // Log very slow requests (>5000ms)
    if (duration > 5000) {
      logger.error({
        type: 'performance',
        method: req.method,
        url: req.originalUrl,
        duration: `${duration.toFixed(2)}ms`,
        threshold: '5000ms'
      }, 'Very slow request detected');
    }
  });

  next();
};

// Error logging middleware
const errorLogger = (err, req, res, next) => {
  logger.error({
    type: 'error',
    method: req.method,
    url: req.originalUrl,
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name
    },
    userId: req.user?.id || 'anonymous',
    ip: req.ip,
    userAgent: req.get('User-Agent')
  }, 'Application error');

  next(err);
};

// Security event logger
const securityLogger = {
  error: (message, data = {}) => {
    logger.error({
      type: 'security',
      message,
      ...data
    }, 'Security error');
  },

  warn: (message, data = {}) => {
    logger.warn({
      type: 'security',
      message,
      ...data
    }, 'Security warning');
  },

  logSuspiciousActivity: (event) => {
    logger.warn({
      type: 'security',
      event: event.type,
      severity: event.severity || 'medium',
      details: event.details,
      ip: event.ip,
      userId: event.userId || 'unknown',
      timestamp: new Date().toISOString()
    }, 'Security event detected');
  },

  logAuthenticationFailure: (details) => {
    logger.warn({
      type: 'auth_failure',
      ...details,
      timestamp: new Date().toISOString()
    }, 'Authentication failure');
  },

  logRateLimitExceeded: (details) => {
    logger.warn({
      type: 'rate_limit',
      ...details,
      timestamp: new Date().toISOString()
    }, 'Rate limit exceeded');
  }
};

// Business event logger
const businessLogger = {
  logCaseCreated: (caseData) => {
    logger.info({
      type: 'business',
      event: 'case_created',
      caseId: caseData.id,
      category: caseData.category,
      priority: caseData.priority,
      userId: caseData.userId,
      timestamp: new Date().toISOString()
    }, 'New case created');
  },

  logCaseStatusChanged: (caseId, oldStatus, newStatus, userId) => {
    logger.info({
      type: 'business',
      event: 'case_status_changed',
      caseId,
      oldStatus,
      newStatus,
      userId,
      timestamp: new Date().toISOString()
    }, 'Case status changed');
  },

  logAIAnalysisCompleted: (caseId, analysisType, duration) => {
    logger.info({
      type: 'business',
      event: 'ai_analysis_completed',
      caseId,
      analysisType,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    }, 'AI analysis completed');
  }
};

module.exports = {
  logger,
  requestLogger,
  performanceLogger,
  errorLogger,
  securityLogger,
  businessLogger
};