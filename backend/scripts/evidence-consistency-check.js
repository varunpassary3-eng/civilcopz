#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 20000);

function normalizeBaseUrl(rawUrl) {
  if (!rawUrl) {
    throw new Error('BASE_URL is required.');
  }

  return rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function parseJsonResponse(response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch (error) {
    throw new Error(`Expected JSON response from ${response.url}, got: ${text.slice(0, 300)}`);
  }
}

async function requestJson(baseUrl, pathName, options = {}) {
  const response = await fetchWithTimeout(`${baseUrl}${pathName}`, options);
  const body = await parseJsonResponse(response);

  return { response, body };
}

async function ensureAuthToken(baseUrl) {
  if (process.env.AUTH_TOKEN) {
    return process.env.AUTH_TOKEN;
  }

  const email = process.env.TEST_USER_EMAIL || `evidence.${Date.now()}@civilcopz.test`;
  const password = process.env.TEST_USER_PASSWORD || 'EvidenceTest@123';

  await requestJson(baseUrl, '/api/users/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      role: 'consumer',
    }),
  });

  const login = await requestJson(baseUrl, '/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!login.response.ok || !login.body.token) {
    throw new Error(`Unable to acquire auth token: status=${login.response.status}`);
  }

  return login.body.token;
}

function logCheck(name, ok, details) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${details}`);
  if (!ok) {
    process.exitCode = 1;
  }
}

async function main() {
  const baseUrl = normalizeBaseUrl(process.env.BASE_URL || process.argv[2]);
  const authToken = await ensureAuthToken(baseUrl);
  const evidencePath =
    process.env.EVIDENCE_PDF_PATH ||
    process.argv[3] ||
    path.join(__dirname, '../tests/fixtures/evidence-sample.pdf');

  if (!evidencePath) {
    throw new Error('EVIDENCE_PDF_PATH is required.');
  }

  const absoluteEvidencePath = path.resolve(evidencePath);
  const evidenceBuffer = await fs.readFile(absoluteEvidencePath);
  const localHash = sha256(evidenceBuffer);
  const evidenceFileName = path.basename(absoluteEvidencePath);

  const form = new FormData();
  const consumerName = process.env.CONSUMER_NAME || 'Staging Validation User';
  form.append('consumerName', consumerName);
  form.append('consumerEmail', process.env.CONSUMER_EMAIL || `staging.${Date.now()}@civilcopz.test`);
  form.append('consumerPhone', process.env.CONSUMER_PHONE || '9999999999');
  form.append('consumerAddress', process.env.CONSUMER_ADDRESS || 'Staging Validation Address, Test District');
  form.append('title', process.env.CASE_TITLE || `Staging Evidence Validation ${Date.now()}`);
  form.append(
    'description',
    process.env.CASE_DESCRIPTION || 'Automated staging validation of evidence hashing, manifest consistency, and custody tracking.'
  );
  form.append('company', process.env.CASE_COMPANY || 'CivilCOPZ Validation Corp');
  form.append('category', process.env.CASE_CATEGORY || 'E-Commerce');
  form.append('jurisdiction', process.env.CASE_JURISDICTION || 'District');
  form.append('considerationPaid', process.env.CONSIDERATION_PAID || '1000');
  form.append('expectedCompensationClient', process.env.EXPECTED_COMPENSATION || '500');
  form.append('isDeclaredTrue', 'true');
  form.append('declaredName', process.env.DECLARED_NAME || consumerName);
  form.append('documents', new Blob([evidenceBuffer], { type: 'application/pdf' }), evidenceFileName);

  const createCaseResponse = await fetchWithTimeout(`${baseUrl}/api/cases`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    body: form,
  });
  const createCaseBody = await parseJsonResponse(createCaseResponse);

  if (createCaseResponse.status !== 201) {
    throw new Error(`Case creation failed with status ${createCaseResponse.status}: ${JSON.stringify(createCaseBody)}`);
  }

  const createdCase = createCaseBody.case;
  const createdDocument = createdCase?.documents?.[0];

  if (!createdCase?.id || !createdDocument?.id) {
    throw new Error('Case creation succeeded but did not return a document record.');
  }

  logCheck('case-created', true, `caseId=${createdCase.id} documentId=${createdDocument.id}`);
  logCheck(
    'document-hash',
    createdDocument.fileHash === localHash,
    `stored=${createdDocument.fileHash} local=${localHash}`
  );

  const custody = await requestJson(baseUrl, '/api/litigation/custody/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      caseId: createdCase.id,
      evidenceId: createdDocument.id,
      reason: 'Automated staging consistency validation',
      transferMethod: 'ELECTRONIC',
      deviceFingerprint: 'staging-validation-runner',
    }),
  });

  logCheck(
    'custody-upload',
    custody.response.ok && custody.body.evidenceId === createdDocument.id,
    `status=${custody.response.status} evidenceId=${custody.body.evidenceId || 'n/a'}`
  );

  const custodyChain = await requestJson(baseUrl, `/api/litigation/custody/chain/${createdCase.id}/${createdDocument.id}`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  logCheck(
    'custody-chain',
    custodyChain.response.ok && custodyChain.body.chainValid === true,
    `status=${custodyChain.response.status} chainValid=${custodyChain.body.chainValid} records=${custodyChain.body.totalRecords || 0}`
  );

  const manifest = await requestJson(baseUrl, `/api/litigation/verification/manifest/${createdCase.id}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  const manifestEvidence = manifest.body?.manifest?.verificationData?.evidence || [];
  const manifestDocument = manifestEvidence.find((entry) => entry.id === createdDocument.id);
  logCheck(
    'manifest-evidence',
    manifest.response.ok && manifestDocument?.fileHash === localHash,
    `status=${manifest.response.status} manifestHash=${manifestDocument?.fileHash || 'missing'} local=${localHash}`
  );

  if (process.exitCode && process.exitCode !== 0) {
    console.error('\nEvidence consistency validation failed.');
    process.exit(process.exitCode);
  }

  console.log('\nEvidence consistency validation passed.');
}

main().catch((error) => {
  console.error(`FAIL evidence-consistency-check: ${error.message}`);
  process.exit(1);
});
