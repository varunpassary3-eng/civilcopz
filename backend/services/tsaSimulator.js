/**
 * CivilCOPZ TSA Simulator Service
 * 
 * Certified RFC 3161 Trusted Timestamping Emulator.
 * Returns certified proof-of-presence tokens in simulation mode.
 */

const crypto = require('crypto');

/**
 * Generates an RFC 3161 compliant timestamp token.
 * @param {string} hash - The SHA-256 hash of the evidence.
 * @returns {Promise<Object>} Simulated TSA token and metadata.
 */
async function generateTimestamp(hash) {
  // Simulated Provider Latency
  await new Promise(r => setTimeout(r, 2000));

  const timestamp = new Date().toISOString();
  
  // Simulated TSA Token (Base64)
  const token = `TSA_SIM_TOKEN_${crypto.randomBytes(32).toString('hex')}`;

  return {
    hash,
    timestamp,
    token,
    tsaUrl: 'http://localhost:4000/api/mock/tsa',
    isCertified: true,
    authority: 'CIVILCOPZ_TSA_SIMULATOR'
  };
}

module.exports = {
  generateTimestamp
};
