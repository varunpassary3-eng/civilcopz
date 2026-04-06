const express = require('express');
const http = require('http');

// 1. ABSOLUTE PORT SOVEREIGNTY: Minimal Web Substrate
const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT || 4000);

// Global State Trackers
const serviceState = {
  initialized: false,
  bootError: null,
  startedAt: null,
  isShuttingDown: false,
  activeRequests: 0,
};

// 2. IMMEDIATE PORT BINDING (Sovereign Gate)
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 CivilCOPZ Sovereign Gateway Active on :${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`[V9-SURVIVAL] Port Secured. Satisfying Cloud Run Lifecycle.`);
});

// 3. PRE-BOOT HEALTH RESPONDERS (Liveness Alignment)
app.get(['/health', '/api/health'], (req, res) => res.status(200).json({ status: 'live' }));
app.get(['/ready', '/api/ready'], (req, res) => {
  if (serviceState.bootError) return res.status(500).json({ status: 'crash', error: serviceState.bootError.message });
  if (!serviceState.initialized) return res.status(503).json({ status: 'initializing' });
  return res.status(200).json({ status: 'ok' });
});

// 3. SOVEREIGN MIDDLEWARE & ROUTE REGISTRATION (Immediate-On)
const cors = require('cors');
const helmet = require('helmet');

app.use(express.json());
app.use(helmet());
app.use(cors());

// 4. FRAGMENTATION GUARD: Protect routes during substrate bootstrap (v12.6)
app.use((req, res, next) => {
  // Allow health/ready/live endpoints through always
  if (['/health', '/ready', '/api/health', '/api/ready'].includes(req.path)) {
    return next();
  }
  
  if (!serviceState.initialized) {
    return res.status(503).json({ 
      error: "Judicial Substrate Fragmentation",
      message: "The platform is still initializing judicial services (Postgres/Redis). Please standby."
    });
  }
  next();
});

// Pre-register routes (v12.0 Deployment Alignment)
// This ensures no 404s during heavy boot
const healthRoutes = require('./routes/health');
const caseRoutes = require('./routes/cases');
const userRoutes = require('./routes/users');
const integrityRoutes = require('./routes/integrity');
const registryWebhookRoutes = require('./routes/registryWebhook');
const litigationRoutes = require('./routes/litigation');
const reputationRoutes = require('./routes/reputation');
const adsRoutes = require('./routes/ads');
const certificateRoutes = require('./routes/certificates');
const dossierRoutes = require('./routes/dossiers');

app.use('/api/health', healthRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/integrity', integrityRoutes);
app.use('/api/registry-webhook', registryWebhookRoutes);
app.use('/api/litigation', litigationRoutes);
app.use('/api/reputation', reputationRoutes);
app.use('/api/company', reputationRoutes); // Legacy Alias for Reactive Risk Scores
app.use('/api/ads', adsRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/dossiers', dossierRoutes);

// 4. JUDICIAL BOOTSTRAP IIFE (Infrastructure Negotiation)
(async () => {
  try {
    console.log('⚖️ Starting Judicial Substrate Bootstrap...');
    
    // --- v11.5 GCP SOVEREIGNTY: Bypass AWS Secrets Dependency ---
    if (!process.env.DB_PASSWORD && !process.env.DATABASE_URL) {
      console.info(`⚖️  Initializing Judicial Substrate (AWS Stage Loading)...`);
      const secretsService = require('./services/secretsService');
      await secretsService.loadSecrets(process.env.AWS_SECRET_ID || "civilcopz/prod");
    }
    
    const bootstrap = require('./bootstrap/env');
    bootstrap.validate({ strict: true });
    
    if (process.env.ALLOW_MOCK_DB_FALLBACK === 'true') {
      serviceState.infraReady = true;
      console.info('🚀 CivilCOPZ Sovereignty: Instant-On readiness signaled.');
    }

    const { waitForInfra } = require('./bootstrap/infra');
    const dbManager = require('./services/databaseManager');
    const adService = require('./services/adService');

    // Infrastructure Negotiation
    await waitForInfra();
    await dbManager.initialize();
    await adService.seedInitialServices();

    serviceState.initialized = true;
    serviceState.startedAt = new Date().toISOString();
    console.log('✅ [V12-STABILIZED] Coherent Judicial Substrate Online.');

  } catch (error) {
    serviceState.bootError = error;
    console.error('❌ CRITICAL_BOOT_FAILURE: Judicial substrate is fragmented.');
    console.error(error.stack);
  }
})();

// Error logging middleware (catch remaining issues)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error(`[RUNTIME_ERROR] ${req.method} ${req.url}:`, err.message);
  res.status(500).json({ error: 'Internal Server Error', trace: err.message });
});

// 5. INDUSTRIAL CONTROL: Support for Worker Mode and Graceful Shutdown
const startWorkerRuntime = async (mode) => {
  try {
    const dbManager = require('./services/databaseManager');
    await dbManager.initialize();
    serviceState.initialized = true;
    serviceState.startedAt = new Date().toISOString();
    console.log(`🤖 [V9-WORKER] ${mode} Substrate Online.`);
  } catch (error) {
    console.error(`❌ [WORKER_INIT_FAILURE] mode=${mode}`, error);
  }
};

// Handle Process Modes
if (require.main === module) {
  if (process.env.WORKER_MODE) {
    startWorkerRuntime(process.env.WORKER_MODE);
  }
}

// 6. AUTHORITATIVE GRACEFUL SHUTDOWN (v4.2 Hardened)
process.on("SIGTERM", async () => {
  console.info("🚨 [SIGTERM] Drain signal received. CivilCOPZ entering DRAIN mode.");
  serviceState.isShuttingDown = true;

  setTimeout(async () => {
    server.close(async () => {
      try {
        console.info("[SHUTDOWN] Closing Substates (Workers -> Cache -> DB)");
        const dbManager = require('./services/databaseManager');
        await dbManager.getWriteClient().$disconnect();
        process.exit(0);
      } catch (err) {
        console.error("[SHUTDOWN_FAILURE]", err);
        process.exit(1);
      }
    });
  }, 5000);
});

module.exports = {
  app,
  server,
  dbManager: () => require('./services/databaseManager'),
  serviceState
};
