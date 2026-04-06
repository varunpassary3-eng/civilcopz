#!/usr/bin/env node

const {
  envOrArg,
  parseArgs,
  printCheck,
  requireValue,
  runGcloudJson,
} = require('./common');

function getContainerEnv(serviceJson) {
  return serviceJson?.spec?.template?.spec?.containers?.[0]?.env || [];
}

function findEnvEntry(serviceJson, name) {
  return getContainerEnv(serviceJson).find((entry) => entry.name === name);
}

function hasSecretRef(entry) {
  return !!entry?.valueFrom?.secretKeyRef?.name;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectId = requireValue('STAGING_PROJECT_ID', envOrArg(args, 'project', 'STAGING_PROJECT_ID', process.env.GCP_PROJECT_ID));
  const region = envOrArg(args, 'region', 'STAGING_REGION', 'us-central1');
  const backendServiceName = envOrArg(args, 'backendService', 'BACKEND_STAGING_SERVICE', 'backend-staging');
  const workerServiceName = envOrArg(args, 'workerService', 'WORKER_STAGING_SERVICE', 'ai-worker-staging');
  const runtimeServiceAccount = requireValue(
    'STAGING_RUNTIME_SERVICE_ACCOUNT',
    envOrArg(args, 'runtimeServiceAccount', 'STAGING_RUNTIME_SERVICE_ACCOUNT')
  );

  process.env.CLOUDSDK_CORE_PROJECT = projectId;

  const backend = runGcloudJson(['run', 'services', 'describe', backendServiceName, '--region', region]);
  const worker = runGcloudJson(['run', 'services', 'describe', workerServiceName, '--region', region]);

  const requiredSecrets = ['DB_PASSWORD', 'REDIS_PASSWORD', 'JWT_SECRET', 'OPENAI_API_KEY', 'AZURE_AI_ENDPOINT', 'AZURE_AI_KEY'];
  const backendSecretVars = ['DB_PASSWORD', 'REDIS_PASSWORD', 'JWT_SECRET', 'OPENAI_API_KEY', 'AZURE_AI_ENDPOINT', 'AZURE_AI_KEY'];
  const workerSecretVars = ['DB_PASSWORD', 'REDIS_PASSWORD', 'OPENAI_API_KEY', 'AZURE_AI_ENDPOINT', 'AZURE_AI_KEY'];

  for (const secret of requiredSecrets) {
    const secretInfo = runGcloudJson(['secrets', 'describe', secret]);
    const policy = runGcloudJson(['secrets', 'get-iam-policy', secret]);
    const bindings = policy.bindings || [];
    const accessorBinding = bindings.find((binding) => binding.role === 'roles/secretmanager.secretAccessor');
    const hasAccess = (accessorBinding?.members || []).includes(`serviceAccount:${runtimeServiceAccount}`);

    printCheck(`secret-exists-${secret.toLowerCase()}`, !!secretInfo.name, `name=${secretInfo.name || 'missing'}`);
    printCheck(`secret-access-${secret.toLowerCase()}`, hasAccess, `runtimeServiceAccount=${runtimeServiceAccount}`);
  }

  for (const envName of backendSecretVars) {
    const entry = findEnvEntry(backend, envName);
    printCheck(`backend-secret-ref-${envName.toLowerCase()}`, hasSecretRef(entry), `env=${envName}`);
  }

  for (const envName of workerSecretVars) {
    const entry = findEnvEntry(worker, envName);
    printCheck(`worker-secret-ref-${envName.toLowerCase()}`, hasSecretRef(entry), `env=${envName}`);
  }

  if (process.exitCode && process.exitCode !== 0) {
    console.error('\nSecret validation failed.');
    process.exit(process.exitCode);
  }

  console.log('\nSecret validation passed.');
}

main().catch((error) => {
  console.error(`validate-secrets failed: ${error.message}`);
  process.exit(1);
});
