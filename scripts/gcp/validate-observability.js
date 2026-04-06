#!/usr/bin/env node

const {
  envOrArg,
  parseArgs,
  printCheck,
  requireValue,
  runGcloudJson,
} = require('./common');

async function hitHealth(baseUrl) {
  if (!baseUrl) {
    return;
  }

  const normalized = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  try {
    await fetch(`${normalized}/health`);
  } catch (error) {
    // We still continue because the log query below is useful even if the probe failed.
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectId = requireValue('STAGING_PROJECT_ID', envOrArg(args, 'project', 'STAGING_PROJECT_ID', process.env.GCP_PROJECT_ID));
  const region = envOrArg(args, 'region', 'STAGING_REGION', 'us-central1');
  const backendServiceName = envOrArg(args, 'backendService', 'BACKEND_STAGING_SERVICE', 'backend-staging');
  const topicName = envOrArg(args, 'topic', 'ROLLBACK_TOPIC_NAME', 'civilcopz-deploy-alerts');
  const rollbackFunction = envOrArg(args, 'functionName', 'ROLLBACK_FUNCTION_NAME', 'civilcopz-rollback');
  const baseUrl = envOrArg(args, 'baseUrl', 'BASE_URL', '');

  process.env.CLOUDSDK_CORE_PROJECT = projectId;

  await hitHealth(baseUrl);

  const policies = runGcloudJson(['monitoring', 'policies', 'list']);
  const dashboards = runGcloudJson(['monitoring', 'dashboards', 'list']);
  const topic = runGcloudJson(['pubsub', 'topics', 'describe', topicName]);
  const func = runGcloudJson(['functions', 'describe', rollbackFunction, '--region', region]);
  const logs = runGcloudJson([
    'logging',
    'read',
    `resource.type="cloud_run_revision" AND resource.labels.service_name="${backendServiceName}"`,
    '--limit=5',
    '--freshness=15m',
  ]);

  const policyList = Array.isArray(policies) ? policies : policies.policies || [];
  const dashboardList = Array.isArray(dashboards) ? dashboards : dashboards.dashboards || [];
  const logList = Array.isArray(logs) ? logs : [];

  const requiredPolicies = [
    'CivilCOPZ Backend Error Rate Alert',
    'CivilCOPZ Backend Latency Alert',
  ];

  for (const displayName of requiredPolicies) {
    const found = policyList.find((policy) => policy.displayName === displayName);
    printCheck(`policy-${displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, !!found, `displayName=${displayName}`);
  }

  printCheck('dashboards-present', dashboardList.length > 0, `dashboards=${dashboardList.length}`);
  printCheck('rollback-topic', !!topic.name, `topic=${topic.name || 'missing'}`);
  printCheck('rollback-function', !!func.name, `function=${func.name || 'missing'}`);
  printCheck('cloud-run-logs', logList.length > 0, `entries=${logList.length}`);

  if (process.exitCode && process.exitCode !== 0) {
    console.error('\nObservability validation failed.');
    process.exit(process.exitCode);
  }

  console.log('\nObservability validation passed.');
}

main().catch((error) => {
  console.error(`validate-observability failed: ${error.message}`);
  process.exit(1);
});
