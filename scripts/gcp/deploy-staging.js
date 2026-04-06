#!/usr/bin/env node

const {
  buildImage,
  envOrArg,
  outputContract,
  parseArgs,
  requireValue,
  runBuild,
  runCommand,
  runGcloud,
  runGcloudJson,
  toCliCsv,
} = require('./common');






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

  // --- v4.2 Sovereign Proof: Readiness & Liveness Isolation ---
  if (config.readinessProbe) {
    const livenessSpec = [
      `httpGet.path=/api/health`, // Fast health check to keep container alive
      `periodSeconds=20`,
      `failureThreshold=3`
    ].join(',');
    
    const startupSpec = [
      `httpGet.path=${config.readinessProbe.path}`, // Gated startup signal
      `periodSeconds=${config.readinessProbe.period || 10}`,
      `failureThreshold=${config.readinessProbe.failureThreshold || 3}`
    ].join(',');
    
    args.push('--liveness-probe', livenessSpec);
    args.push('--startup-probe', startupSpec);
  }

  if (config.timeout) {
    args.push('--timeout', String(config.timeout));
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
  const skipBackend = args.skipBackend === true || process.env.SKIP_BACKEND_DEPLOY === 'true' || (args.service && args.service !== 'backend');
  const skipWorker = args.skipWorker === true || process.env.SKIP_WORKER_DEPLOY === 'true' || (args.service && args.service !== 'worker');
  const skipFrontend = args.skipFrontend === true || process.env.SKIP_FRONTEND_DEPLOY === 'true' || (args.service && args.service !== 'frontend');

  const projectId = envOrArg(args, 'project', 'STAGING_PROJECT_ID', process.env.GCP_PROJECT_ID || 'civilcopz-project-2026');
  const region = envOrArg(args, 'region', 'STAGING_REGION', 'asia-south1');

  const repository = envOrArg(args, 'repository', 'ARTIFACT_REPOSITORY', 'civilcopz');
  const imageTag = requireValue('IMAGE_TAG', envOrArg(args, 'tag', 'IMAGE_TAG', process.env.GITHUB_SHA || 'latest'));
  const backendServiceName = envOrArg(args, 'backendService', 'BACKEND_STAGING_SERVICE', 'civilcopz-backend');
  const workerServiceName = envOrArg(args, 'workerService', 'WORKER_STAGING_SERVICE', 'civilcopz-ai-worker');
  const frontendServiceName = envOrArg(args, 'frontendService', 'FRONTEND_STAGING_SERVICE', 'civilcopz-frontend');

  const dbHost = envOrArg(args, 'dbHost', 'STAGING_CLOUD_SQL_PRIVATE_IP', '');
  const redisHost = envOrArg(args, 'redisHost', 'STAGING_REDIS_PRIVATE_IP', '');
  const network = envOrArg(args, 'network', 'STAGING_VPC_NETWORK', 'civilcopz-network');
  const subnet = envOrArg(args, 'subnet', 'STAGING_VPC_SUBNET', 'civilcopz-subnet');
  const bucketName = envOrArg(args, 'bucket', 'STAGING_BUCKET_NAME', 'civilcopz-evidence-staging');
  const dbName = envOrArg(args, 'dbName', 'STAGING_DB_NAME', 'civilcopz');
  const dbUser = envOrArg(args, 'dbUser', 'STAGING_DB_USER', 'civilcopz_user');
  const corsOrigin = envOrArg(args, 'corsOrigin', 'STAGING_CORS_ORIGIN', '');

  const backendImage = envOrArg(
    args,
    'backendImage',
    'BACKEND_IMAGE',
    buildImage(projectId, region, repository, 'backend', imageTag)
  );
  const workerImage = envOrArg(args, 'workerImage', 'AI_WORKER_IMAGE', backendImage);
  const frontendImage = envOrArg(
    args,
    'frontendImage',
    'FRONTEND_IMAGE',
    buildImage(projectId, region, repository, 'frontend-staging', imageTag)
  );

  const secretVersions = {
    DB_PASSWORD: envOrArg(args, 'dbPasswordVersion', 'DB_PASSWORD_SECRET_VERSION', 'latest'),
    REDIS_PASSWORD: envOrArg(args, 'redisPasswordVersion', 'REDIS_PASSWORD_SECRET_VERSION', 'latest'),
    JWT_SECRET: envOrArg(args, 'jwtSecretVersion', 'JWT_SECRET_SECRET_VERSION', 'latest'),
    OPENAI_API_KEY: envOrArg(args, 'openAiSecretVersion', 'OPENAI_API_KEY_SECRET_VERSION', 'latest'),
    AZURE_AI_ENDPOINT: envOrArg(args, 'azureEndpointVersion', 'AZURE_AI_ENDPOINT_SECRET_VERSION', 'latest'),
    AZURE_AI_KEY: envOrArg(args, 'azureKeyVersion', 'AZURE_AI_KEY_SECRET_VERSION', 'latest'),
  };

  if (Object.values(secretVersions).includes('latest')) {
    console.warn('Warning: one or more secret versions are set to latest. Cloud Run env-var secrets are safer when pinned to explicit versions.');
  }

  const skipBuild = args.skipBuild === true || process.env.SKIP_BUILD === 'true';

  runGcloud(['config', 'set', 'project', projectId], { capture: false, dryRun });

  if (!skipBuild) {
    console.log('🏗️  Starting industrial build cycle for project:', projectId);
    if (!skipBackend) {
      console.log('📦 Building backend image (Monorepo context: root)...');
      // Use the declarative YAML to ensure root context with backend Dockerfile
      runBuild(backendImage, '.', { 
        project: projectId, 
        config: 'scripts/gcp/build-backend.yaml',
        substitutions: `_IMAGE=${backendImage}`,
        dryRun 
      });
    }
    if (!skipFrontend) {
      console.log('📦 Building frontend image...');
      runBuild(frontendImage, './frontend', { project: projectId, dryRun });
    }
  }



  const backendSecretBindings = buildSecretSpec(
    ['DB_PASSWORD', 'REDIS_PASSWORD', 'JWT_SECRET', 'OPENAI_API_KEY', 'AZURE_AI_ENDPOINT', 'AZURE_AI_KEY'],
    secretVersions
  );
  const workerSecretBindings = buildSecretSpec(
    ['DB_PASSWORD', 'REDIS_PASSWORD', 'OPENAI_API_KEY', 'AZURE_AI_ENDPOINT', 'AZURE_AI_KEY'],
    secretVersions
  );

  if (!skipBackend) {
    deployRunService(backendServiceName, {
      image: backendImage,
      region,
      port: 4000,
      cpu: 2,
      memory: '2Gi',
      minInstances: 1, // Ensure warm start for diagnostics
      maxInstances: 3,
      concurrency: 80,
      network,
      subnet,
      timeout: 300, // Increased for cold-start Sovereign Boot
      readinessProbe: {
        path: '/api/ready',
        period: 10,
        failureThreshold: 10
      },
      secretBindings: backendSecretBindings,
      envVars: {
        NODE_ENV: 'staging',
        DB_HOST: dbHost,
        DB_NAME: dbName,
        DB_USER: dbUser,
        REDIS_HOST: redisHost,
        GCS_BUCKET: bucketName,
        ALLOW_MOCK_DB_FALLBACK: 'true',
        ALLOW_AI_MOCK_FALLBACK: 'false',
        ...(corsOrigin ? { CORS_ORIGIN: corsOrigin } : {}),
      },


    }, dryRun);
  }

  if (!skipWorker) {
    deployRunService(workerServiceName, {
      image: workerImage,
      region,
      port: 4000,
      cpu: 2,
      memory: '2Gi',
      minInstances: 0,
      maxInstances: 2,
      concurrency: 1,
      network,
      subnet,
      secretBindings: workerSecretBindings,
      envVars: {
        NODE_ENV: 'staging',
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
  }

  if (!skipFrontend) {
    deployRunService(frontendServiceName, {
      image: frontendImage,
      region,
      port: 80,
      cpu: 1,
      memory: '512Mi',
      minInstances: 0,
      maxInstances: 3,
      concurrency: 1000,
      envVars: {},
    }, dryRun);
  }

  if (!dryRun) {
    const backend = skipBackend ? null : runGcloudJson(['run', 'services', 'describe', backendServiceName, '--region', region]);
    const worker = skipWorker ? null : runGcloudJson(['run', 'services', 'describe', workerServiceName, '--region', region]);
    const frontend = skipFrontend ? null : runGcloudJson(['run', 'services', 'describe', frontendServiceName, '--region', region]);

    console.log('\nStaging deployment summary');
    if (backend) {
      console.log(`Backend URL: ${backend.status?.url || 'unknown'}`);
    }
    if (worker) {
      console.log(`Worker URL: ${worker.status?.url || 'unknown'}`);
    }
    if (frontend) {
      console.log(`Frontend URL: ${frontend.status?.url || 'unknown'}`);
    }
  }

  outputContract({
    status: 'SUCCESS',
    stage: 'DEPLOY',
    details: 'Deployment completed successfully.',
    revisions: {
      backend: !skipBackend && !dryRun ? runGcloudJson(['run', 'services', 'describe', backendServiceName, '--region', region]).status.latestReadyRevisionName : 'dry-run',
      worker: !skipWorker && !dryRun ? runGcloudJson(['run', 'services', 'describe', workerServiceName, '--region', region]).status.latestReadyRevisionName : 'dry-run',
    },
  });
}


main().catch((error) => {
  const isJson = process.argv.includes('--json');
  if (isJson) {
    console.log(JSON.stringify({
      status: 'FAILURE',
      stage: 'DEPLOY',
      details: error.message,
    }));
  } else {
    console.error(`deploy-staging failed: ${error.message}`);
  }
  process.exit(1);
});

