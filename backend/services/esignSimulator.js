/**
 * CivilCOPZ eSign Simulator Service
 * 
 * Protocol emulator for Aadhaar eSign. 
 * Mimics the async Redirect -> Callback flow with 2-second provider latency.
 */

const crypto = require('crypto');

/**
 * Initiates an asynchronous eSign protocol.
 * @param {Buffer} pdfBuffer - The document to be signed.
 * @param {Object} user - User metadata (e.g. Aadhaar masked).
 * @returns {Promise<Object>} Simulated txnId and redirectUrl.
 */
async function initiateESign(pdfBuffer, user) {
  const hash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

  // Simulated Provider Latency
  await new Promise(r => setTimeout(r, 2000));

  const txnId = `SIM-${Date.now()}`;
  
  return {
    txnId,
    redirectUrl: `/api/mock/esign/simulate?txn=${txnId}&hash=${hash}`,
    hash
  };
}

/**
 * Simulates the external provider callback.
 * @param {string} txnId - The transaction ID.
 * @returns {Promise<Object>} Signed document metadata.
 */
async function simulateCallback(txnId) {
  // Simulated Provider Callback Delay
  await new Promise(r => setTimeout(r, 2000));

  return {
    txnId,
    status: 'SIGNED',
    signedAt: new Date().toISOString(),
    certificateHash: crypto.randomBytes(32).toString('hex'),
    provider: 'ADHAAR_ESIGN_SIMULATOR'
  };
}

module.exports = {
  initiateESign,
  simulateCallback
};
