#!/usr/bin/env node

const DEFAULT_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 15000);

function normalizeBaseUrl(rawUrl) {
  if (!rawUrl) {
    throw new Error('BASE_URL is required. Example: node scripts/staging-readiness.js https://staging.example.com');
  }

  return rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(baseUrl, path) {
  const response = await fetchWithTimeout(`${baseUrl}${path}`);
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function fetchText(baseUrl, path) {
  const response = await fetchWithTimeout(`${baseUrl}${path}`);
  const body = await response.text();
  return { response, body };
}

function printResult(result) {
  const prefix = result.ok ? 'PASS' : 'FAIL';
  console.log(`${prefix} ${result.name}: ${result.message}`);
}

async function main() {
  const baseUrl = normalizeBaseUrl(process.argv[2] || process.env.BASE_URL);
  const results = [];

  const startup = await fetchJson(baseUrl, '/startup');
  results.push({
    name: 'startup',
    ok: startup.response.ok && startup.body.status === 'ok',
    message: `status=${startup.response.status} body.status=${startup.body.status || 'n/a'}`,
  });

  const health = await fetchJson(baseUrl, '/health');
  results.push({
    name: 'health',
    ok:
      health.response.ok &&
      health.body.status === 'ok' &&
      health.body.services?.database === 'connected' &&
      health.body.services?.redis === 'connected',
    message: `status=${health.response.status} database=${health.body.services?.database || 'n/a'} redis=${health.body.services?.redis || 'n/a'}`,
  });

  const readiness = await fetchJson(baseUrl, '/api/ready');
  results.push({
    name: 'readiness',
    ok: readiness.response.ok && readiness.body.status === 'ready',
    message: `status=${readiness.response.status} body.status=${readiness.body.status || 'n/a'}`,
  });

  const metrics = await fetchText(baseUrl, '/metrics');
  const requiredMetrics = ['http_requests_total', 'http_request_duration_seconds', 'database_connections'];
  const missingMetrics = requiredMetrics.filter((metric) => !metrics.body.includes(metric));
  results.push({
    name: 'metrics',
    ok: metrics.response.ok && missingMetrics.length === 0,
    message:
      missingMetrics.length === 0
        ? `status=${metrics.response.status} required metrics present`
        : `status=${metrics.response.status} missing metrics: ${missingMetrics.join(', ')}`,
  });

  results.forEach(printResult);

  const failures = results.filter((result) => !result.ok);
  if (failures.length > 0) {
    console.error(`\nStaging readiness failed for ${failures.length} check(s).`);
    process.exit(1);
  }

  console.log('\nStaging readiness passed.');
}

main().catch((error) => {
  console.error(`FAIL staging-readiness: ${error.message}`);
  process.exit(1);
});
