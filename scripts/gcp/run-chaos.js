#!/usr/bin/env node

const {
  buildImage,
  envOrArg,
  outputContract,
  parseArgs,
  requireValue,
  runGcloud,
  runGcloudJson,
  runK6,
  toCliCsv,
} = require('./common');

const INVALID_PRIVATE_IP = '203.0.113.10';

function buildSecretSpec(secrets, versionBySecret) {
  return secrets
    .map((secret) => `${secret}=${secret}:${versionBySecret[secret] || 'latest'}`)
    .join(',');
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

function deployScenarioService(serviceName, config, dryRun) {
  const args = [
    'run',
    'deploy',
    serviceName,
    '--image',
    config.image,
    '--region',
    config.region,
    '--platform',
    'managed',
    '--allow-unauthenticated',
    '--port',
    '4000',
    '--cpu',
    '1',
    '--memory',
    '1Gi',
    '--min-instances',
    '0',
    '--max-instances',
    '1',
    '--concurrency',
    '10',
    '--network',
    config.network,
    '--subnet',
    config.subnet,
    '--vpc-egress',
    'all-traffic',
    '--set-env-vars',
    toCliCsv(config.envVars),
    '--set-secrets',
    config.secretBindings,
  ];

  runGcloud(args, { capture: false, dryRun });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const scenario = requireValue('scenario', args.scenario);
  const dryRun = args.dryRun === true || process.env.DRY_RUN === 'true';
  const cleanup = args.cleanup === true || process.env.CLEANUP_AFTER_CHAOS === 'true';
  
  const projectId = requireValue('STAGING_PROJECT_ID', envOrArg(args, 'project', 'STAGING_PROJECT_ID', process.env.GCP_PROJECT_ID));
  const region = envOrArg(args, 'region', 'STAGING_REGION', 'asia-south1');

  const backendServiceName = envOrArg(args, 'backendService', 'BACKEND_STAGING_SERVICE', 'backend-staging');
  const dbHost = requireValue('STAGING_CLOUD_SQL_PRIVATE_IP', envOrArg(args, 'dbHost', 'STAGING_CLOUD_SQL_PRIVATE_IP'));
  const redisHost = requireValue('STAGING_REDIS_PRIVATE_IP', envOrArg(args, 'redisHost', 'STAGING_REDIS_PRIVATE_IP'));
  const network = requireValue('STAGING_VPC_NETWORK', envOrArg(args, 'network', 'STAGING_VPC_NETWORK'));
  const subnet = requireValue('STAGING_VPC_SUBNET', envOrArg(args, 'subnet', 'STAGING_VPC_SUBNET'));
  const bucketName = requireValue('STAGING_BUCKET_NAME', envOrArg(args, 'bucket', 'STAGING_BUCKET_NAME'));
  const dbName = envOrArg(args, 'dbName', 'STAGING_DB_NAME', 'civilcopz');
  const dbUser = envOrArg(args, 'dbUser', 'STAGING_DB_USER', 'civilcopz_user');

  const repository = envOrArg(args, 'repository', 'ARTIFACT_REPOSITORY', 'civilcopz');
  const imageTag = envOrArg(args, 'tag', 'IMAGE_TAG', process.env.GITHUB_SHA || 'latest');
  
  const backendImage = envOrArg(
    args,
    'backendImage',
    'BACKEND_IMAGE',
    imageTag !== 'latest' ? buildImage(projectId, region, repository, 'backend', imageTag) : null
  );

  requireValue('BACKEND_IMAGE', backendImage);

  const secretVersions = {
    DB_PASSWORD: envOrArg(args, 'dbPasswordVersion', 'DB_PASSWORD_SECRET_VERSION', 'latest'),
    REDIS_PASSWORD: envOrArg(args, 'redisPasswordVersion', 'REDIS_PASSWORD_SECRET_VERSION', 'latest'),
    JWT_SECRET: envOrArg(args, 'jwtSecretVersion', 'JWT_SECRET_SECRET_VERSION', 'latest'),
    OPENAI_API_KEY: envOrArg(args, 'openAiSecretVersion', 'OPENAI_API_KEY_SECRET_VERSION', 'latest'),
    AZURE_AI_ENDPOINT: envOrArg(args, 'azureEndpointVersion', 'AZURE_AI_ENDPOINT_SECRET_VERSION', 'latest'),
    AZURE_AI_KEY: envOrArg(args, 'azureKeyVersion', 'AZURE_AI_KEY_SECRET_VERSION', 'latest'),
  };

  process.env.CLOUDSDK_CORE_PROJECT = projectId;

  if (dryRun) {
    console.log(`--- CI/CD Chaos Resilience Audit (DRY RUN: scenario=${scenario}) ---`);
    outputContract({
      status: 'SUCCESS',
      stage: 'CHAOS',
      details: `Dry run: Chaos scenario ${scenario} bypassed.`,
    });
    return;
  }

  if (scenario === 'latency') {
    const baseUrl = requireValue('BASE_URL', envOrArg(args, 'baseUrl', 'BASE_URL'));
    const vus = envOrArg(args, 'vus', 'K6_VUS', '200');
    const duration = envOrArg(args, 'duration', 'K6_DURATION', '2m');

    runK6(['run', '--vus', String(vus), '--duration', String(duration), 'load-test.js'], {
      capture: false,
      dryRun,
      env: { ...process.env, BASE_URL: baseUrl },
      cwd: process.cwd(),
    });

    outputContract({ status: 'SUCCESS', stage: 'CHAOS', details: `Latency test completed: ${scenario}` });
    return;
  }

  const secretBindings = buildSecretSpec(
    ['DB_PASSWORD', 'REDIS_PASSWORD', 'JWT_SECRET', 'OPENAI_API_KEY', 'AZURE_AI_ENDPOINT', 'AZURE_AI_KEY'],
    secretVersions
  );

  const serviceName = `${backendServiceName}-chaos-${scenario}`;
  const envVars = {
    NODE_ENV: 'staging',
    DB_HOST: dbHost,
    DB_NAME: dbName,
    DB_USER: dbUser,
    REDIS_HOST: redisHost,
    GCS_BUCKET: bucketName,
    ALLOW_MOCK_DB_FALLBACK: 'false',
    ALLOW_AI_MOCK_FALLBACK: 'false',
  };

  if (scenario === 'db') {
    envVars.DB_HOST = INVALID_PRIVATE_IP;
  } else if (scenario === 'redis') {
    envVars.REDIS_HOST = INVALID_PRIVATE_IP;
  } else if (scenario === 'ai') {
    envVars.CHAOS_AI_FAILURE_MODE = 'timeout';
    envVars.AI_REQUEST_TIMEOUT_MS = '5000';
  } else {
    throw new Error(`Unsupported scenario: ${scenario}`);
  }

  deployScenarioService(serviceName, {
    image: backendImage,
    region,
    network,
    subnet,
    envVars,
    secretBindings,
  }, dryRun);

  const service = runGcloudJson(['run', 'services', 'describe', serviceName, '--region', region]);
  const url = service.status?.url;
  if (!url) throw new Error(`No URL returned for chaos service ${serviceName}`);

  console.log(`Testing chaos endpoint: ${url}`);

  if (scenario === 'ai') {
    const result = await fetchJson(`${url}/api/ai/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Staging AI timeout validation request' }),
    });
    const ok = result.response.status >= 500;
    console.log(`${ok ? 'PASS' : 'FAIL'} ai-timeout: status=${result.response.status}`);
    if (!ok) process.exitCode = 1;
  } else {
    const result = await fetchJson(`${url}/health`);
    const serviceStatus = result.body?.services || {};
    const ok = result.response.status >= 500 || Object.values(serviceStatus).includes('disconnected');
    console.log(`${ok ? 'PASS' : 'FAIL'} ${scenario}-failure: status=${result.response.status} body=${JSON.stringify(result.body)}`);
    if (!ok) process.exitCode = 1;
  }

  if (cleanup) {
    runGcloud(['run', 'services', 'delete', serviceName, '--region', region, '--quiet'], {
      capture: false,
      allowFailure: true,
    });
  }

  const passed = !process.exitCode || process.exitCode === 0;

  outputContract({
    status: passed ? 'SUCCESS' : 'FAILURE',
    stage: 'CHAOS',
    details: passed ? `Chaos test passed for scenario: ${scenario}` : `Chaos test failed for scenario: ${scenario}`,
  });

  if (!passed) process.exit(process.exitCode);
}

main().catch((error) => {
  console.error(`run-chaos failed: ${error.message}`);
  process.exit(1);
});
