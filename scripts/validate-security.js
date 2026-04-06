#!/usr/bin/env node

const DEFAULT_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 15000);

function normalizeBaseUrl(rawUrl) {
  if (!rawUrl) {
    throw new Error('BASE_URL is required.');
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

async function jsonRequest(url, options = {}) {
  const response = await fetchWithTimeout(url, options);
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

function printCheck(name, ok, details) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${details}`);
  if (!ok) {
    process.exitCode = 1;
  }
}

async function ensureConsumerToken(baseUrl) {
  const email = process.env.TEST_USER_EMAIL || `security.${Date.now()}@civilcopz.test`;
  const password = process.env.TEST_USER_PASSWORD || 'SecurityTest@123';

  await jsonRequest(`${baseUrl}/api/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      role: 'consumer',
    }),
  });

  const login = await jsonRequest(`${baseUrl}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!login.response.ok || !login.body.token) {
    throw new Error(`Failed to login consumer test user: status=${login.response.status}`);
  }

  return login.body.token;
}

async function main() {
  const baseUrl = normalizeBaseUrl(process.argv[2] || process.env.BASE_URL);

  const unauthorized = await jsonRequest(`${baseUrl}/api/certificates/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      caseId: 'test-case',
      evidenceId: 'test-evidence',
      evidenceType: 'DOCUMENT',
    }),
  });

  printCheck(
    'unauthorized-admin-endpoint',
    unauthorized.response.status === 401,
    `status=${unauthorized.response.status}`
  );

  const consumerToken = await ensureConsumerToken(baseUrl);
  const nonAdmin = await jsonRequest(`${baseUrl}/api/certificates/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${consumerToken}`,
    },
    body: JSON.stringify({
      caseId: 'test-case',
      evidenceId: 'test-evidence',
      evidenceType: 'DOCUMENT',
    }),
  });

  printCheck(
    'non-admin-blocked',
    nonAdmin.response.status === 403,
    `status=${nonAdmin.response.status}`
  );

  if (process.exitCode && process.exitCode !== 0) {
    console.error('\nSecurity validation failed.');
    process.exit(process.exitCode);
  }

  console.log('\nSecurity validation passed.');
}

main().catch((error) => {
  console.error(`validate-security failed: ${error.message}`);
  process.exit(1);
});
