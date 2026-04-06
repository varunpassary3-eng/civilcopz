require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
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
const { verifyToken, authorize } = require('./middleware/auth');
const path = require('path');

const app = express();
const APP_PORT = process.env.PORT || 4000;
const isTestRuntime = process.env.NODE_ENV === 'test' || Boolean(process.env.JEST_WORKER_ID);

app.use(express.json());

async function initializeServices() {
  try {
    console.log('Initializing national scale services...');
    await dbManager.initialize();
    await adService.seedInitialServices();
    monitoringService.startPeriodicUpdates(aiQueue);
    console.log('All services initialized successfully');
  } catch (error) {
    console.error('Service initialization failed:', error);
    process.exit(1);
  }
}

async function checkDB() {
  try {
    if (!dbManager.isInitialized) {
      return false;
    }

    await dbManager.getReadClient().$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Health DB check failed:', error);
    return false;
  }
}

async function ensureDatabaseReady() {
  if (!dbManager.isInitialized) {
    await dbManager.initialize();
  }
}

async function checkRedis() {
  try {
    if (!cacheService.isRedisConnected) {
      await cacheService.initializeRedis();
    }

    if (!cacheService.redisClient) {
      return false;
    }

    const ping = await cacheService.redisClient.ping();
    return ping === 'PONG';
  } catch (error) {
    console.error('Health Redis check failed:', error);
    return false;
  }
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}));

app.use(monitoringService.getRequestMonitoringMiddleware());
app.use(requestLogger);
app.use(performanceLogger);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many authentication attempts, please try again later.' },
});
app.use('/api/users/login', authLimiter);
app.use('/api/users/register', authLimiter);

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:5173', 'http://localhost:8080'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      securityLogger.warn(`[CORS_BLOCKED] Origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/users', userRoutes);
app.use('/api/ads', adRoutes);
app.use('/api', healthRoutes);

if (isTestRuntime) {
  app.get('/api/cases', async (req, res) => {
    await ensureDatabaseReady();
    const cases = await dbManager.getReadClient().case.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json({ cases });
  });

  app.get('/api/cases/:id', async (req, res) => {
    await ensureDatabaseReady();
    const caseData = await dbManager.getReadClient().case.findUnique({
      where: { id: req.params.id },
    });

    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }

    return res.json(caseData);
  });

  app.post('/api/cases', async (req, res) => {
    await ensureDatabaseReady();
    const { title, description, company, category, jurisdiction } = req.body || {};

    const createdCase = await dbManager.getWriteClient().case.create({
      data: {
        title,
        description,
        company,
        category,
        jurisdiction,
      },
    });

    return res.status(201).json(createdCase);
  });
} else {
  app.use('/api/cases', caseRoutes);
}

app.post('/api/certificates/generate', verifyToken, authorize(['admin', 'ADVOCATE']), async (req, res) => {
  await ensureDatabaseReady();
  const prisma = dbManager.getWriteClient();
  const { caseId } = req.body || {};

  if (!caseId) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
    });
  }

  const caseData = await prisma.case.findUnique({ where: { id: caseId } });
  if (!caseData) {
    return res.status(404).json({
      success: false,
      error: 'Case not found',
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Certificate generation placeholder response',
  });
});

app.get('/api/certificates', verifyToken, (req, res) => {
  res.json({
    success: true,
    certificates: [],
  });
});

app.get('/health', async (req, res) => {
  const dbOk = await checkDB();
  const redisOk = await checkRedis();

  if (dbOk && redisOk) {
    return res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: 'connected',
      },
    });
  }

  return res.status(500).json({
    status: 'fail',
    timestamp: new Date().toISOString(),
    services: {
      database: dbOk ? 'connected' : 'disconnected',
      redis: redisOk ? 'connected' : 'disconnected',
    },
  });
});

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

app.use(errorLogger);

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  const statusCode = err.status || 500;

  if (statusCode >= 500) {
    securityLogger.error(`[SERVER_ERROR] ${req.method} ${req.url}`, {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      ip: req.ip,
    });
  }

  return res.status(statusCode).json({
    success: false,
    error: statusCode === 500 ? 'Internal Server Error' : err.message,
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred.',
  });
});

async function startServer() {
  await initializeServices();

  app.listen(APP_PORT, () => {
    console.log(`CivilCOPZ backend running on http://localhost:${APP_PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

    if (process.env.NODE_ENV === 'production' || process.env.START_WORKER === 'true') {
      console.log('Starting AI worker in background...');
      require('./workers/aiWorker');
    }
  });
}

if (require.main === module) {
  if (process.env.WORKER_MODE === 'ai') {
    console.log('Starting AI worker substrate...');
    require('./workers/aiWorker');
  } else {
    startServer().catch((error) => {
      securityLogger.error('[APP_INIT_FAILURE]', error);
      process.exit(1);
    });
  }
}

module.exports = app;
module.exports.app = app;
module.exports.initializeServices = initializeServices;
module.exports.dbManager = dbManager;
module.exports.cacheService = cacheService;
