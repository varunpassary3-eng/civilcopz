const net = require('net');
const { exec } = require('child_process');

/**
 * CivilCOPZ Port Guard Substrate (Operations-Grade - Phase 11)
 * Deterministic detection and identification of Port 3000 conflicts.
 */
function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => server.close(() => resolve(true)))
      .listen(port);
  });
}

function getProcessOnPort(port) {
  return new Promise((resolve) => {
    const platform = process.platform;

    let cmd;
    if (platform === 'win32') {
      cmd = `netstat -ano | findstr :${port}`;
    } else {
      cmd = `lsof -i :${port} -sTCP:LISTEN -n -P`;
    }

    exec(cmd, (err, stdout) => {
      if (err || !stdout) return resolve(null);
      resolve(stdout.trim());
    });
  });
}

async function ensurePort3000() {
  const free = await isPortFree(3000);

  if (free) {
    console.log('✅ Port 3000 is free');
    return { free: true };
  }

  const proc = await getProcessOnPort(3000);

  console.warn(`
⚠️ Port 3000 is IN USE

Process Details:
${proc || 'Unknown'}

👉 Decision Flow:
- Redirection shim will be skipped to prevent conflict.
- Primary UI entry point is http://localhost:5173.
`);

  return { free: false, proc };
}

module.exports = { ensurePort3000 };
