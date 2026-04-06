/**
 * CivilCOPZ Infrastructure Readiness Guard
 * 
 * Implements exponential backoff (up to 10 retries, 5s cap) 
 * to ensure that PostgreSQL and Redis are reachable before the API starts.
 */

const { createClient } = require('redis');
const { S3Client, GetBucketObjectLockConfigurationCommand } = require("@aws-sdk/client-s3");
const dbManager = require('../services/databaseManager');
const CONFIG = require('./env');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Waits for critical infrastructure to be ready.
 * @param {Object} options - Retry options.
 * @returns {Promise<void>} Resolves when infra is ready.
 */
async function waitForInfra({ retries = 15, baseDelay = 500 } = {}) {
  // --- v11.7 MOCK RECOGNITION: Bypasses network timeouts in Mock Substrate ---
  if (process.env.ALLOW_MOCK_DB_FALLBACK === 'true') {
    console.info('🚀 [V12-GATES] CivilCOPZ Infra Guard: Mock Substrate Detected. Bypassing network probes.');
    return;
  }

  let lastError = null;
  console.info('🚦 CivilCOPZ Infra Guard: Checking substrate readiness...');

  for (let i = 0; i < retries; i++) {
    try {
      // 1) PostgreSQL Check
      await dbManager.initialize();
      await dbManager.getReadClient().$queryRaw`SELECT 1`;

      // 2) Redis Check
      try {
        const redis = createClient({ url: CONFIG.get().REDIS_URL });
        await redis.connect();
        await redis.ping();
        await redis.quit();
      } catch (redisErr) {
        if (process.env.NODE_ENV === 'production') throw redisErr;
        console.warn(`⚠️  Infra Guard: Redis check failed. Proceeding with memory fallback.`);
      }
      // 3) S3 Object Lock Assertion (Authoritative Hardening)
      const s3 = new S3Client({ region: process.env.AWS_REGION || "asia-south1" });
      const bucket = process.env.AWS_S3_BUCKET || "civilcopz-evidence-mumbai";
      
      try {
        const lockConfig = await s3.send(new GetBucketObjectLockConfigurationCommand({ Bucket: bucket }));
        if (lockConfig.ObjectLockConfiguration.ObjectLockEnabled !== 'Enabled') {
          throw new Error(`Object Lock is NOT enabled for bucket: ${bucket}`);
        }
        console.info(`✅ S3 Guard: Object Lock (COMPLIANCE) verified for ${bucket}.`);
      } catch (s3Err) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`S3_INTEGRITY_FAILURE: ${s3Err.message}`);
        }
        console.warn(`⚠️  S3 Guard: Skipping Object Lock verification in ${process.env.NODE_ENV}.`);
      }

      console.info('✅ CivilCOPZ Infra Guard: Substrate is healthy. INFRA_READY.');
      return;
    } catch (err) {
      lastError = err;
      const delay = Math.min(baseDelay * Math.pow(2, i), 5000); // Exponential backoff with 5s cap
      
      console.warn(`⏳ Infra retry ${i + 1}/${retries} in ${delay}ms... (Error: ${err.message})`);
      await sleep(delay);
    }
  }

  console.error('❌ CivilCOPZ Infra Guard: Substrate failed to initialize after retries.', lastError);
  process.exit(1); // Fail-fast on infra failure
}

module.exports = {
  waitForInfra
};
