require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const caseRoutes = require('./routes/cases');
const userRoutes = require('./routes/users');
const adRoutes = require('./routes/ads');
const healthRoutes = require('./routes/health');
const dbManager = require('./services/databaseManager');
const adService = require('./services/adService');
const monitoringService = require('./services/monitoringService');
const cacheService = require('./services/cacheService');
const { requestLogger, performanceLogger, errorLogger, securityLogger } = require('./services/loggingService');
const aiQueue = require('./queue/aiQueue');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

// Initialize national scale services
async function initializeServices() {
  try {
    console.log('🚀 Initializing national scale services...');

    // Initialize database manager
    await dbManager.initialize();

    // Seed initial advisory services (Legal Aid/Advisory)
    await adService.seedInitialServices();

    // Start monitoring service
    monitoringService.startPeriodicUpdates(aiQueue);

    console.log('✅ All services initialized successfully');
  } catch (error) {
    console.error('❌ Service initialization failed:', error);
    process.exit(1);
  }
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Request monitoring middleware (must be before other middleware)
app.use(monitoringService.getRequestMonitoringMiddleware());

// Structured logging middleware
app.use(requestLogger);
app.use(performanceLogger);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// API rate limiting (stricter for auth endpoints)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Increased slightly for usability but still strict
  message: { error: 'Too many authentication attempts, please try again later.' },
});
app.use('/api/users/login', authLimiter);
app.use('/api/users/register', authLimiter);

// CORS configuration - Strict production whitelist
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',') 
  : ['http://localhost:5173', 'http://localhost:8080'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      securityLogger.warn(`[CORS_BLOCKED] Origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Route registration
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/users', userRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/ads', adRoutes);
app.use('/api', healthRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  const health = monitoringService.getHealthStatus();
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

// Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
  try {
    const metrics = await monitoringService.getMetrics();
    res.set('Content-Type', monitoringService.getMetricsContentType());
    res.send(metrics);
  } catch (error) {
    securityLogger.error('[METRICS_ERROR]', error);
    res.status(500).send('Error generating metrics');
  }
});

// Error logging middleware
app.use(errorLogger);

// Global Error Handler
app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  
  // Security logging for severe errors
  if (statusCode >= 500) {
    securityLogger.error(`[SERVER_ERROR] ${req.method} ${req.url}`, {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      ip: req.ip
    });
  }

  return res.status(statusCode).json({
    success: false,
    error: statusCode === 500 ? 'Internal Server Error' : err.message,
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred.'
  });
});

const APP_PORT = process.env.PORT || 4000;

// Check if running in worker mode
if (process.env.WORKER_MODE === 'ai') {
  console.log('🚀 Starting AI Worker Substrate...');
  require('./workers/aiWorker');
} else {
  // Initialize services and start the web server
  initializeServices().then(() => {
    app.listen(APP_PORT, () => {
      console.log(`✅ CivilCOPZ backend running on http://localhost:${APP_PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

      // Start AI worker in background if not in worker-only mode
      if (process.env.NODE_ENV === 'production' || process.env.START_WORKER === 'true') {
        console.log('🤖 Starting AI Worker in background...');
        require('./workers/aiWorker');
      }
    });
  }).catch((error) => {
    securityLogger.error('[APP_INIT_FAILURE]', error);
    process.exit(1);
  });
}
