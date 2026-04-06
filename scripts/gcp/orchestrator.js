#!/usr/bin/env node

const {
  envOrArg,
  parseArgs,
  requireValue,
  runContractScript,
  runGcloud,
  runGcloudJson,
} = require('./common');

async function getSafetyTarget(serviceName, region) {
  try {
    const service = runGcloudJson(['run', 'services', 'describe', serviceName, '--region', region]);
    const traffic = service.status?.traffic || [];
    const mainTraffic = traffic.find(t => t.percent === 100) || traffic[0];
    return mainTraffic?.revisionName || null;
  } catch (error) {
    console.warn(`Warning: Could not fetch baseline for ${serviceName}: ${error.message}`);
    return null;
  }
}

async function rollback(serviceName, region, revisionName) {
  if (!revisionName) {
    console.error(`Cannot rollback ${serviceName}: No safety target revision available.`);
    return;
  }
  console.log(`Reverting ${serviceName} to revision ${revisionName}...`);
  runGcloud(['run', 'services', 'update-traffic', serviceName, '--region', region, `--to-revisions=${revisionName}=100`]);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = args.dryRun === true || process.env.DRY_RUN === 'true';
  const isProd = args.prod === true || process.env.NODE_ENV === 'production';
  const envPrefix = isProd ? 'PROD' : 'STAGING';

  // Dynamic Parameter Resolution
  const projectId = requireValue(`${envPrefix}_PROJECT_ID`, envOrArg(args, 'project', `${envPrefix}_PROJECT_ID`, process.env.GCP_PROJECT_ID));
  const region = envOrArg(args, 'region', `${envPrefix}_REGION`, 'asia-south1');

  const backendServiceName = envOrArg(args, 'backendService', `BACKEND_${envPrefix}_SERVICE`, isProd ? 'backend-production' : 'backend-staging');
  const workerServiceName = envOrArg(args, 'workerService', `WORKER_${envPrefix}_SERVICE`, isProd ? 'ai-worker-production' : 'ai-worker-staging');
  const frontendServiceName = envOrArg(args, 'frontendService', `FRONTEND_${envPrefix}_SERVICE`, isProd ? 'frontend-production' : 'frontend-staging');



  console.log('--- CivilCOPZ Production-Grade Orchestrator ---');
  console.log(`Project: ${projectId}`);
  console.log(`Region: ${region}`);

  // 1. Baseline Discovery (Safety Targets)
  console.log('\n[Phase 0] baseline-discovery');
  const backendSafety = await getSafetyTarget(backendServiceName, region);
  const workerSafety = await getSafetyTarget(workerServiceName, region);
  const frontendSafety = await getSafetyTarget(frontendServiceName, region);
  console.log(`Backend Safety Target: ${backendSafety || 'NONE'}`);
  console.log(`Worker Safety Target: ${workerSafety || 'NONE'}`);
  console.log(`Frontend Safety Target: ${frontendSafety || 'NONE'}`);


  let deployedRevisions = {};
  let deployedUrls = {};


  try {
    // 2. Phase 1: Deploy
    const deployScript = isProd ? 'scripts/gcp/deploy-production.js' : 'scripts/gcp/deploy-staging.js';
    console.log(`\n[Phase 1] ${isProd ? 'deploy-production' : 'deploy-staging'}`);
    const deployContract = runContractScript(deployScript, [...process.argv.slice(2), '--json'], { dryRun });
    deployedRevisions = deployContract.revisions || {};
    deployedUrls = deployContract.urls || {};
    console.log('Deployment successful.');
    if (deployedUrls.frontend) {
      console.log(`\nFRONTEND HUD: ${deployedUrls.frontend}`);
    }



    // 3. Phase 2: Validate
    console.log('\n[Phase 2] deterministic-validation');
    runContractScript('scripts/gcp/validate-gcp-mirror.js', [
      ...process.argv.slice(2),
      '--backendService', backendServiceName,
      '--workerService', workerServiceName,
      '--frontendService', frontendServiceName,
      '--json'
    ], { dryRun });
    console.log('Validation passed.');

    // 4. Phase 3: Chaos
    console.log('\n[Phase 3] chaos-resilience (scenario=ai)');
    runContractScript('scripts/gcp/run-chaos.js', [
      ...process.argv.slice(2),
      '--backendService', backendServiceName,
      '--workerService', workerServiceName,
      '--scenario=ai',
      '--json',
      '--cleanup'
    ], { dryRun });
    console.log('Chaos testing passed.');



    console.log('\n✅ ORCHESTRATION COMPLETE: All phases passed.');
    console.log('The environment is stable and live at:');
    if (deployedUrls.frontend) console.log(`- Frontend HUD: ${deployedUrls.frontend}`);
    if (deployedUrls.backend) console.log(`- Backend API:  ${deployedUrls.backend}`);
    console.log('\nService Revisions:');
    console.log(`- Backend Revision:  ${deployedRevisions.backend || 'unknown'}`);
    console.log(`- Worker Revision:   ${deployedRevisions.worker || 'unknown'}`);
    console.log(`- Frontend Revision: ${deployedRevisions.frontend || 'unknown'}`);



  } catch (error) {
    console.error(`\n❌ ORCHESTRATION FAILED: ${error.message}`);
    
    if (dryRun) {
      console.log('Dry run: Skipping rollback.');
      process.exit(1);
    }

    console.log('\n[Phase 4] automated-rollback');
    let rollbackFailed = false;
    
    try {
      if (backendSafety) await rollback(backendServiceName, region, backendSafety);
      if (workerSafety) await rollback(workerServiceName, region, workerSafety);
      if (frontendSafety) await rollback(frontendServiceName, region, frontendSafety);

    } catch (rbError) {
      console.error(`Emergency: Rollback failed! ${rbError.message}`);
      rollbackFailed = true;
    }

    if (rollbackFailed) {
      console.error('SYSTEM STATE: CRITICAL INSTABILITY. Manual intervention required.');
    } else {
      console.log('Rollback successful. Environment restored to baseline.');
    }

    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`Fatal orchestrator error: ${error.message}`);
  process.exit(1);
});
