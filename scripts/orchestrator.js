const path = require('path');
const { spawn, execSync, exec } = require('child_process');
const fs = require('fs');
const { ensurePort3000 } = require('./orchestrator/portGuard');

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m"
};

const appCwd = fs.existsSync(path.join(__dirname, '../app')) 
  ? path.join(__dirname, '../app') 
  : path.join(__dirname, '../frontend');

const SERVICES = {
  backend: {
    name: 'BACKEND-API',
    cmd: 'node server.js',
    cwd: path.join(__dirname, '../backend'),
    color: colors.green
  },
  app: {
    name: 'DASHBOARD-APP',
    cmd: 'npm run dev',
    cwd: appCwd, // Substrate-isolated industrial 'app' or 'frontend' folder
    color: colors.cyan
  },
  legacyRedirect: {
    name: 'LEGACY-3000',
    cmd: 'node legacy-redirect.js',
    cwd: path.join(__dirname, '..'), // Run from root where the file is
    color: colors.red
  },
  enforcement: {
    name: 'ENFORCEMENT',
    cmd: 'node server.js',
    cwd: path.join(__dirname, '../backend'),
    color: colors.red
  }
};

function startService(config, env = {}) {
  const { name, cmd, cwd, color } = config;
  const [command, ...args] = cmd.split(' ');
  
  console.log(`${color}[${name}] 🚀 Booting substrate...${colors.reset}`);
  
  const proc = spawn(command, args, {
    cwd,
    shell: true,
    stdio: 'inherit',
    env: { ...process.env, ...env }
  });

  proc.on('error', (err) => {
    console.error(`${colors.red}[${name}] ❌ FAILURE: ${err.message}${colors.reset}`);
  });
}

(async () => {
  console.clear();
  console.log(`${colors.bright}${colors.magenta}=== CivilCOPZ Platform Orchestrator (v1.5) ===${colors.reset}\n`);

  console.log("🔍 Checking National Port Sovereignty...");

  const port3000 = await ensurePort3000();

  // Start Backend Substrate
  startService(SERVICES.backend);

  // Start App Substrate
  startService(SERVICES.app);

  // Start AI Worker Substrate (DEPRECATED: Now runs in main Backend process to save memory)
  // startService(SERVICES.backend, { WORKER_MODE: 'ai' });

  // Start Statutory Enforcement Engine (DEPRECATED: Now runs in main Backend process to save memory)
  // startService(SERVICES.enforcement, { WORKER_MODE: 'enforcement' });

  // Handle Legacy Port 3000 (Safety Net)
  if (port3000.free) {
    startService(SERVICES.legacyRedirect);
  } else {
    console.warn(`${colors.yellow}⚠️  Port 3000 Occupied — Skipping industrial redirect shim.${colors.reset}`);
  }

  // Final status report
  setTimeout(() => {
    console.log(`
${colors.bright}${colors.green}🚀 CivilCOPZ System READY - END-TO-END LIFECYCLE ACTIVE

${colors.bright}${colors.cyan}👉 ENTRY (UI):      http://localhost:5173
${colors.bright}${colors.yellow}🔧 API GATEWAY:     http://localhost:4000
${colors.bright}${colors.green}📡 SOCKETS:         Real-time Substrate Online (:4000)
${colors.bright}${colors.magenta}🤖 AI WORKER:       Lifecycle Automation Active
${colors.bright}${colors.red}⚖️  ENFORCEMENT:     Statutory Deadline Monitor Online

${colors.bright}${colors.red}⚠️  Maintenance:    Ensure 'npx prisma generate' and 'npm install' are run.
${colors.bright}${colors.red}🐘 Substrate:       Redis MUST be running for AI & Enforcement Lifecycle workers.

Use ONLY 5173 for Dashboard UI.
${colors.reset}`);
  }, 5000);

})();
