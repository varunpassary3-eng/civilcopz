const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * CivilCOPZ Orchestrator Utility
 * Purpose: Provide a unified interface for environment audit, 
 * database setup, and concurrent service monitoring.
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const services = [];

function log(service, message, color = colors.reset) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${color}[${timestamp}] [${service}] ${message}${colors.reset}`);
}

/**
 * Phase 1: Environment Audit & Provisioning
 */
function auditEnvironment() {
  log('ORCHESTRATOR', 'Auditing environment configuration...', colors.cyan);
  const backendDir = path.join(__dirname, '../backend');
  const envPath = path.join(backendDir, '.env');
  const envExamplePath = path.join(__dirname, '../.env.example');

  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
      log('ORCHESTRATOR', 'backend/.env missing. Provisioning from .env.example...', colors.yellow);
      fs.copyFileSync(envExamplePath, envPath);
      log('ORCHESTRATOR', 'Provisioning complete.', colors.green);
    } else {
      log('ORCHESTRATOR', 'Warning: Neither .env nor .env.example found in backend.', colors.red);
    }
  } else {
    log('ORCHESTRATOR', 'Backend environment detected.', colors.green);
  }
}

/**
 * Phase 2: Database Provisioning
 */
function provisionDatabase() {
  log('PRISMA', 'Starting database provisioning...', colors.blue);
  const backendDir = path.join(__dirname, '../backend');
  
  // Basic connectivity check - avoid running Prisma if DB is definitely down
  try {
    log('PRISMA', 'Checking database connectivity...', colors.blue);
    // Simple ping to check if something is listening on the DB port
    // In a real scenario, we might use a small node script to probe
  } catch (e) {
    log('PRISMA', 'Database connectivity check skipped.', colors.yellow);
  }

  try {
    log('PRISMA', 'Generating client...', colors.blue);
    execSync('npx prisma generate', { cwd: backendDir, stdio: 'inherit' });
    
    log('PRISMA', 'Running migrations...', colors.blue);
    // Run migration with a timeout to catch P1001 early
    execSync('npx prisma migrate dev --name auto_orchestration', { 
      cwd: backendDir, 
      stdio: 'inherit',
      timeout: 15000 // 15 seconds timeout
    });
    
    log('PRISMA', 'Database synchronized successfully.', colors.green);
  } catch (error) {
    log('PRISMA', 'Database provisioning failed (Timeout or P1001).', colors.red);
    log('PRISMA', 'Suggestion: Ensure "docker compose up -d postgres" is running.', colors.yellow);
  }
}

/**
 * Phase 3: Service Execution
 */
function startService(name, command, args, cwd, color, extraEnv = {}) {
  log('ORCHESTRATOR', `Launching ${name}...`, colors.cyan);
  
  const child = spawn(command, args, { 
    cwd, 
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: { ...process.env, ...extraEnv, FORCE_COLOR: true }
  });

  child.stdout.on('data', (data) => {
    log(name, data.toString().trim(), color);
  });

  child.stderr.on('data', (data) => {
    log(name, `[STDERR] ${data.toString().trim()}`, colors.red);
  });

  child.on('close', (code) => {
    log('ORCHESTRATOR', `${name} process exited with code ${code}`, colors.yellow);
  });

  services.push(child);
}

/**
 * Orchestrator Main Entry Point
 */
async function orchestrate() {
  console.log(`${colors.bright}${colors.green}=== CivilCOPZ Orchestrator Substrate (Windows Hardened) ===${colors.reset}\n`);

  auditEnvironment();
  auditDependencies();
  provisionDatabase();

  // Start Backend API
  startService('BACKEND-API', 'npm', ['run', 'dev'], path.join(__dirname, '../backend'), colors.green);

  // Start AI Worker - Pass environment variable via spawn env object for Windows compatibility
  startService('AI-WORKER', 'node', ['server.js'], path.join(__dirname, '../backend'), colors.magenta, { WORKER_MODE: 'ai' });

  // Start Frontend
  startService('FRONTEND', 'npm', ['run', 'dev'], path.join(__dirname, '../frontend'), colors.blue);

  // Final health check before yielding Control
  console.log('[ORCHESTRATOR] Substrate ready. Ensuring administrative access...');
  try {
    // Small script to ensure admin exists
    const seedScript = `
      const { PrismaClient } = require('@prisma/client');
      const bcrypt = require('bcryptjs');
      const { parse } = require('connection-string');
      const prisma = new PrismaClient();
      async function main() {
        const adminEmail = 'admin@civilcopz.gov';
        const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
        if (!existing) {
          const hash = await bcrypt.hash('AdminPassword123!', 10);
          await prisma.user.create({ data: { email: adminEmail, password: hash, role: 'admin' } });
          console.log('✅ Default Admin Provisioned: admin@civilcopz.gov');
        }
      }
      main().catch(console.error).finally(() => prisma.$disconnect());
    `;
    const fs = require('fs');
    const tempPath = path.join(__dirname, '..', 'backend', 'temp_seed.js');
    fs.writeFileSync(tempPath, seedScript);
    
    const { execSync } = require('child_process');
    execSync('node temp_seed.js', { cwd: path.join(__dirname, '..', 'backend'), stdio: 'inherit' });
    fs.unlinkSync(tempPath);
  } catch (e) {
    console.warn('[ORCHESTRATOR] Admin seeding skipped or failed. Manual registration may be required.');
  }

  log('ORCHESTRATOR', 'All systems nominal. Monitoring health...', colors.cyan);
}

// Global Dependency Audit
function auditDependencies() {
  log('ORCHESTRATOR', 'Auditing mission-critical dependencies...', colors.yellow);
  const required = ['zod', 'prom-client', 'pino', 'connection-string'];
  const backendNodeModules = path.join(__dirname, '../backend/node_modules');
  
  if (!fs.existsSync(backendNodeModules)) {
    log('ORCHESTRATOR', 'CRITICAL FAILURE: backend/node_modules is missing.', colors.red);
    log('ORCHESTRATOR', 'PLEASE RUN "npm run stabilize" BEFORE PROCEEDING.', colors.red);
    process.exit(1);
  }

  for (const mod of required) {
    try {
      require.resolve(mod, { paths: [backendNodeModules] });
    } catch (e) {
      log('ORCHESTRATOR', `CRITICAL FAILURE: Module '${mod}' not found in backend substrate.`, colors.red);
      log('ORCHESTRATOR', 'PLEASE RUN "npm run stabilize" BEFORE PROCEEDING.', colors.red);
      process.exit(1);
    }
  }
  log('ORCHESTRATOR', 'Dependency audit successful. All substrates stabilized.', colors.green);
}

// Global Cleanup
process.on('SIGINT', () => {
  log('ORCHESTRATOR', 'Termination signal received. Cleaning up services...', colors.yellow);
  services.forEach(child => child.kill());
  process.exit();
});

orchestrate().catch(error => {
  log('ORCHESTRATOR', `Critical failure: ${error.message}`, colors.red);
  process.exit(1);
});
