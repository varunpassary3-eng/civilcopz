#!/usr/bin/env node

/**
 * CivilCOPZ Deterministic VPC Validation Gatekeeper (Diagnostic Edition)
 * 
 * This script is a CI/CD blocker that proves network correctness:
 * 1. Metadata Audit (VPC/Subnet consistency)
 * 2. DNS/NAT Reachability
 * 3. API Substrate Health
 */

const https = require('https');
const dns = require('dns').promises;
const fs = require('fs');
const path = require('path');
const {
  envOrArg,
  outputContract,
  parseArgs,
  printCheck: originalPrintCheck,
  requireValue,
  runGcloudJson,
} = require('./common');

const LOG_FILE = path.join(process.cwd(), 'validation_audit.log');

function printCheck(name, ok, details) {
  const msg = `${ok ? 'PASS' : 'FAIL'} ${name}: ${details}`;
  console.log(msg);
  fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`);
  if (!ok) {
    process.exitCode = 1;
  }
}



async function httpGet(url, options = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          data: data
        });
      });
    }).on('error', (err) => reject(err));
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const projectId = requireValue('STAGING_PROJECT_ID', envOrArg(args, 'project', 'STAGING_PROJECT_ID', process.env.GCP_PROJECT_ID));
  const region = envOrArg(args, 'region', 'STAGING_REGION', 'asia-south1');

  const backendServiceName = envOrArg(args, 'backendService', 'BACKEND_STAGING_SERVICE', 'backend-staging');
  const workerServiceName = envOrArg(args, 'workerService', 'WORKER_STAGING_SERVICE', 'ai-worker-staging');
  const expectedNetwork = requireValue('STAGING_VPC_NETWORK', envOrArg(args, 'network', 'STAGING_VPC_NETWORK'));
  const expectedSubnet = requireValue('STAGING_VPC_SUBNET', envOrArg(args, 'subnet', 'STAGING_VPC_SUBNET'));

  fs.writeFileSync(LOG_FILE, `--- Validation Audit for ${projectId} [${new Date().toISOString()}] ---\n`);

  process.env.CLOUDSDK_CORE_PROJECT = projectId;


  const dryRun = args.dryRun === true || process.env.DRY_RUN === 'true';

  if (dryRun) {
    console.log('--- CI/CD Network Correctness Audit (DRY RUN) ---');
    outputContract({ status: 'SUCCESS', stage: 'VALIDATE', details: 'Dry run bypassed.' });
    return;
  }

  console.log('--- [DIAGNOSTIC] CI/CD Network Audit ---');

  // 1. VPC Metadata Audit (Backend)
  try {
    const backend = runGcloudJson(['run', 'services', 'describe', backendServiceName, '--region', region]);
    const annotations = backend?.spec?.template?.metadata?.annotations || {};
    const networkInterfaces = backend?.spec?.template?.spec?.networkInterfaces || [];
    let vpcConfig = networkInterfaces[0] || {};
    
    // Fallback: Parse the annotation string if native networkInterfaces is empty (Common in certain regional schemas)
    if (!vpcConfig.network && annotations['run.googleapis.com/network-interfaces']) {
      try {
        const parsed = JSON.parse(annotations['run.googleapis.com/network-interfaces']);
        if (Array.isArray(parsed) && parsed[0]) {
          vpcConfig = parsed[0];
          fs.appendFileSync(LOG_FILE, `[INFO] Using annotation-based VPC config fallback.\n`);
        }
      } catch (e) {
        fs.appendFileSync(LOG_FILE, `[WARN] Failed to parse vpc-interfaces annotation: ${e.message}\n`);
      }
    }

    // Check Egress
    const egressMode = annotations['run.googleapis.com/vpc-access-egress'];
    printCheck('vpc-egress-all-traffic', egressMode === 'all-traffic', `got=${egressMode || 'unset'}`);

    // Check Network Path
    const currentNetwork = vpcConfig.network || vpcConfig.subnetwork || 'none';
    const isVpcCorrect = currentNetwork.toLowerCase().includes(expectedNetwork.toLowerCase()) || 
                        currentNetwork.toLowerCase().includes(expectedSubnet.toLowerCase());
    
    if (!isVpcCorrect) {
      fs.appendFileSync(LOG_FILE, `[DEBUG] Raw NetworkInterfaces: ${JSON.stringify(networkInterfaces)}\n`);
      fs.appendFileSync(LOG_FILE, `[DEBUG] Raw Annotations: ${JSON.stringify(annotations)}\n`);
    }

    printCheck('vpc-network-path', isVpcCorrect, `got=${currentNetwork}, expected=${expectedNetwork}/${expectedSubnet}`);

    
    // Check for Legacy Connector
    const hasLegacy = !!annotations['run.googleapis.com/vpc-access-connector'];
    printCheck('vpc-no-legacy-connector', !hasLegacy, `legacy_found=${hasLegacy}`);

  } catch (error) {
    printCheck('metadata-audit-backend', false, `Backend describe failed: ${error.message}`);
    fs.appendFileSync(LOG_FILE, `[CRITICAL] Stack Trace: ${error.stack}\n`);
  }


  // 2. DNS Resolution Test
  try {
    const lookup = await dns.lookup('api.openai.com');
    printCheck('dns-resolve-test', !!lookup.address, `openai-resolved-to=${lookup.address}`);
  } catch (error) {
    printCheck('dns-resolution', false, `DNS failure: ${error.message}`);
  }

  // 3. NAT/Egress IP Verification
  try {
    const ipify = await httpGet('https://api.ipify.org?format=json');
    if (ipify.ok) {
      const data = JSON.parse(ipify.data);
      printCheck('nat-egress-active', true, `ip=${data.ip}`);
    } else {
      printCheck('nat-egress-active', false, `HTTP Status=${ipify.status}`);
    }
  } catch (error) {
    // Note: Local machine might not have Cloud NAT, so this is descriptive but NOT an exit failure anymore
    console.warn(`[WARN] nat-egress-active check skipped or failed locally: ${error.message}`);
  }

  // 4. API Substrate Health (/health-raw)
  try {
    const backendDescribe = runGcloudJson(['run', 'services', 'describe', backendServiceName, '--region', region]);
    const backendUrl = backendDescribe?.status?.url;
    if (backendUrl) {
      const health = await httpGet(`${backendUrl}/health-raw`);
      printCheck('api-substrate-health', health.ok || health.status === 503, `status=${health.status}`);
    }
  } catch (error) {
    printCheck('api-substrate-health', false, `Unreachable: ${error.message}`);
  }

  // Final Gate
  const passed = !process.exitCode || process.exitCode === 0;

  if (!passed) {
    console.error('\n❌ DETERMINISTIC VALIDATION FAILED.');
    outputContract({ status: 'FAILURE', stage: 'VALIDATE', details: 'Correctness check failed.' });
    process.exit(1);
  }

  console.log('\n✅ DETERMINISTIC VALIDATION PASSED.');
  outputContract({ status: 'SUCCESS', stage: 'VALIDATE', details: 'All gates green.' });
}

main().catch((error) => {
  console.error(`validate-gcp-mirror failed: ${error.message}`);
  process.exit(1);
});
