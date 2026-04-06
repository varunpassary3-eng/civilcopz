#!/usr/bin/env node

const {
  buildImage,
  envOrArg,
  outputContract,
  parseArgs,
  requireValue,
  runBuild,
  runGcloud,
  runGcloudJson,
  toCliCsv,
} = require('./common');

/**
 * Production Deployment Orchestrator
 * Enforces strict scaling and data integrity constraints for National Scale.
 */

function buildSecretSpec(secrets, versionBySecret) {
  return secrets
    .map((secret) => `${secret}=${secret}:${versionBySecret[secret] || 'latest'}`)
    .join(',');
}

function deployRunService(serviceName, config, dryRun) {
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
    String(config.port),
    '--cpu',
    String(config.cpu),
    '--memory',
    config.memory,
    '--min-instances',
    String(config.minInstances),
    '--max-instances',
    String(config.maxInstances),
    '--concurrency',
    String(config.concurrency),
  ];

  if (config.network || config.subnet) {
    if (config.network) {
      args.push('--network', config.network);
    }
    if (config.subnet) {
      args.push('--subnet', config.subnet);
    }
    args.push('--vpc-egress', 'all-traffic');
  }

  if (config.envVars && Object.keys(config.envVars).length > 0) {
    args.push('--set-env-vars', toCliCsv(config.envVars));
  }

  if (config.secretBindings) {
    args.push('--set-secrets', config.secretBindings);
  }

  runGcloud(args, { capture: false, dryRun });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = args.dryRun === true || process.env.DRY_RUN === 'true';
  
  // Production identifiers
  const projectId = requireValue('PRODUCTION_PROJECT_ID', envOrArg(args, 'project', 'PRODUCTION_PROJECT_ID', process.env.GCP_PROJECT_ID));
  const region = envOrArg(args, 'region', 'PRODUCTION_REGION', 'asia-south1');
  const repository = envOrArg(args, 'repository', 'ARTIFACT_REPOSITORY', 'civilcopz');
  const imageTag = requireValue('IMAGE_TAG', envOrArg(args, 'tag', 'IMAGE_TAG', process.env.GITHUB_SHA));

  const backendServiceName = envOrArg(args, 'backendService', 'BACKEND_PROD_SERVICE', 'backend-production');
  const workerServiceName = envOrArg(args, 'workerService', 'WORKER_PROD_SERVICE', 'ai-worker-production');
  const frontendServiceName = envOrArg(args, 'frontendService', 'FRONTEND_PROD_SERVICE', 'frontend-production');


  const dbHost = requireValue('PROD_CLOUD_SQL_PRIVATE_IP', envOrArg(args, 'dbHost', 'PROD_CLOUD_SQL_PRIVATE_IP'));
  const redisHost = requireValue('PROD_REDIS_PRIVATE_IP', envOrArg(args, 'redisHost', 'PROD_REDIS_PRIVATE_IP'));
  const network = requireValue('PROD_VPC_NETWORK', envOrArg(args, 'network', 'PROD_VPC_NETWORK'));
  const subnet = requireValue('PROD_VPC_SUBNET', envOrArg(args, 'subnet', 'PROD_VPC_SUBNET'));
  const bucketName = requireValue('PROD_BUCKET_NAME', envOrArg(args, 'bucket', 'PROD_BUCKET_NAME'));
  const dbName = envOrArg(args, 'dbName', 'PROD_DB_NAME', 'civilcopz_prod');
  const dbUser = envOrArg(args, 'dbUser', 'PROD_DB_USER', 'civilcopz_admin');

  const backendImage = buildImage(projectId, region, repository, 'backend', imageTag);
  const workerImage = backendImage; // Use same image for worker
  const frontendImage = buildImage(projectId, region, repository, 'frontend', imageTag);


  const secretVersions = {
    DB_PASSWORD: envOrArg(args, 'dbPasswordVersion', 'PROD_DB_PASSWORD_VERSION', 'latest'),
    REDIS_PASSWORD: envOrArg(args, 'redisPasswordVersion', 'PROD_REDIS_PASSWORD_VERSION', 'latest'),
    JWT_SECRET: envOrArg(args, 'jwtSecretVersion', 'PROD_JWT_SECRET_VERSION', 'latest'),
    OPENAI_API_KEY: envOrArg(args, 'openAiSecretVersion', 'PROD_OPENAI_KEY_VERSION', 'latest'),
    AZURE_AI_ENDPOINT: envOrArg(args, 'azureEndpointVersion', 'PROD_AZURE_ENDPOINT_VERSION', 'latest'),
    AZURE_AI_KEY: envOrArg(args, 'azureKeyVersion', 'PROD_AZURE_KEY_VERSION', 'latest'),
  };

  runGcloud(['config', 'set', 'project', projectId], { capture: false, dryRun });

  // Build Phase (Production usually promotes images from Staging, but for this manual-deploy-v1 we build fresh)
  if (!args.skipBuild) {
    console.log('🏗️  Starting Production build cycle...');
    if (!args.skipBackend) {
      runBuild(backendImage, './backend', { project: projectId, dryRun });
    }
    if (!args.skipFrontend) {
      runBuild(frontendImage, './frontend', { project: projectId, dryRun });
    }
  }


  const backendSecrets = buildSecretSpec(['DB_PASSWORD', 'REDIS_PASSWORD', 'JWT_SECRET', 'OPENAI_API_KEY', 'AZURE_AI_ENDPOINT', 'AZURE_AI_KEY'], secretVersions);
  const workerSecrets = buildSecretSpec(['DB_PASSWORD', 'REDIS_PASSWORD', 'OPENAI_API_KEY', 'AZURE_AI_ENDPOINT', 'AZURE_AI_KEY'], secretVersions);

  // Deploy Backend
  console.log('🚀 Deploying PRODUCTION Backend (Scaled Tier)...');
  deployRunService(backendServiceName, {
    image: backendImage,
    region,
    port: 4000,
    cpu: 2,
    memory: '4Gi',
    minInstances: 1, // Production Baseline
    maxInstances: 10,
    concurrency: 80,
    network,
    subnet,
    secretBindings: backendSecrets,
    envVars: {
      NODE_ENV: 'production',
      DB_HOST: dbHost,
      DB_NAME: dbName,
      DB_USER: dbUser,
      REDIS_HOST: redisHost,
      GCS_BUCKET: bucketName,
      ALLOW_MOCK_DB_FALLBACK: 'false', // STRICT ENFORCEMENT
      ALLOW_AI_MOCK_FALLBACK: 'false',
    },
  }, dryRun);

  // Deploy Worker
  console.log('🚀 Deploying PRODUCTION AI Worker...');
  deployRunService(workerServiceName, {
    image: workerImage,
    region,
    port: 4000,
    cpu: 2,
    memory: '4Gi',
    minInstances: 1,
    maxInstances: 5,
    concurrency: 1,
    network,
    subnet,
    secretBindings: workerSecrets,
    envVars: {
      NODE_ENV: 'production',
      WORKER_MODE: 'ai',
      DB_HOST: dbHost,
      DB_NAME: dbName,
      DB_USER: dbUser,
      REDIS_HOST: redisHost,
      GCS_BUCKET: bucketName,
      ALLOW_MOCK_DB_FALLBACK: 'false',
      ALLOW_AI_MOCK_FALLBACK: 'false',
    },
  }, dryRun);

  // Deploy Frontend
  if (!args.skipFrontend) {
    console.log('🚀 Deploying PRODUCTION Frontend...');
    deployRunService(frontendServiceName, {
      image: frontendImage,
      region,
      port: 80,
      cpu: 1,
      memory: '1Gi',
      minInstances: 1,
      maxInstances: 5,
      concurrency: 1000,
      envVars: {
        NODE_ENV: 'production',
      },
    }, dryRun);
  }


  if (!dryRun) {
    const backendData = runGcloudJson(['run', 'services', 'describe', backendServiceName, '--region', region]);
    const workerData = runGcloudJson(['run', 'services', 'describe', workerServiceName, '--region', region]);
    const frontendData = !args.skipFrontend ? runGcloudJson(['run', 'services', 'describe', frontendServiceName, '--region', region]) : null;

    outputContract({
      status: 'SUCCESS',
      stage: 'DEPLOY_PROD',
      details: 'Production rollout successful.',
      revisions: {
        backend: backendData.status?.latestReadyRevisionName,
        worker: workerData.status?.latestReadyRevisionName,
        frontend: frontendData?.status?.latestReadyRevisionName,
      },
      urls: {
        backend: backendData.status?.url,
        worker: workerData.status?.url,
        frontend: frontendData?.status?.url,
      },
    });
  } else {
    outputContract({
      status: 'SUCCESS',
      stage: 'DEPLOY_PROD',
      details: 'Production dry-run successful.',
      revisions: { backend: 'dry-run', worker: 'dry-run', frontend: 'dry-run' },
      urls: { backend: 'dry-run', worker: 'dry-run', frontend: 'dry-run' },
    });
  }

}

main().catch((error) => {
  console.error(`deploy-production failed: ${error.message}`);
  process.exit(1);
});
