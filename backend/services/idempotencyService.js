/**
 * CivilCOPZ Idempotency Service
 * 
 * Uses Redis (SET NX EX) to ensure that asynchronous legal callbacks 
 * (e.g., eSign, TSA, Court Filing) are processed exactly once.
 */

const cacheService = require('./cacheService');

/**
 * Attempts to acquire an idempotency token for a specific event.
 * @param {string} key - The namespaced key (e.g., 'esign:cb:txn_123').
 * @param {number} ttlSec - Time-to-live in seconds (default: 3600).
 * @returns {Promise<boolean>} True if the token was acquired, False if it's a duplicate.
 */
async function acquireOnce(key, ttlSec = 3600) {
  if (!cacheService.isRedisConnected) {
    console.warn(`[IDEMPOTENCY_WARNING] Redis not connected. Falling back to optimistic execution for: ${key}`);
    return true; // Fallback for limited environments
  }

  const redis = cacheService.redisClient;
  const lockKey = `idempotency:${key}`;

  // SET key value NX EX ttl → returns 'OK' if set, null if exists
  const result = await redis.set(lockKey, '1', 'NX', 'EX', ttlSec);
  
  if (result === 'OK') {
    console.info(`[IDEMPOTENCY_ACQUIRED] Key: ${lockKey}`);
    return true;
  }

  console.warn(`[IDEMPOTENCY_DUPLICATE_IGNORED] Key: ${lockKey}`);
  return false;
}

module.exports = {
  acquireOnce
};
