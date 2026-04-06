/**
 * RemediationService: Self-Healing Litigation Engine
 * Normalizes unstructured registry notes and providing actionable procedural advice.
 */
class RemediationService {
  /**
   * Scrutiny Code Dictionary (v5.2 Normalized)
   */
  get SCRUTINY_CODES() {
    return {
      HASH_MISMATCH: 'HASH_MISMATCH',
      SIGNATURE_INVALID: 'SIGNATURE_INVALID',
      FEE_INSUFFICIENT: 'FEE_INSUFFICIENT',
      ANNEXURE_MISSING: 'ANNEXURE_MISSING',
      JURISDICTION_ERROR: 'JURISDICTION_ERROR',
      TSA_INVALID: 'TSA_INVALID',
      UNKNOWN: 'UNKNOWN'
    };
  }

  /**
   * Analyzes raw registry notes to extract a deterministic ScrutinyCode.
   */
  analyzeDefect(notes = '') {
    const lowerNotes = notes.toLowerCase();

    if (lowerNotes.includes('hash') && lowerNotes.includes('mismatch')) return this.SCRUTINY_CODES.HASH_MISMATCH;
    if (lowerNotes.includes('signature') || lowerNotes.includes('signed')) return this.SCRUTINY_CODES.SIGNATURE_INVALID;
    if (lowerNotes.includes('fee') || lowerNotes.includes('payment')) return this.SCRUTINY_CODES.FEE_INSUFFICIENT;
    if (lowerNotes.includes('annexure') || lowerNotes.includes('missing')) return this.SCRUTINY_CODES.ANNEXURE_MISSING;
    if (lowerNotes.includes('jurisdiction') || lowerNotes.includes('forum')) return this.SCRUTINY_CODES.JURISDICTION_ERROR;
    if (lowerNotes.includes('timestamp') || lowerNotes.includes('tsa')) return this.SCRUTINY_CODES.TSA_INVALID;

    return this.SCRUTINY_CODES.UNKNOWN;
  }

  /**
   * Returns a human-readable, actionable strategy for a given ScrutinyCode.
   */
  getRemediationStrategy(code) {
    const strategies = {
      [this.SCRUTINY_CODES.HASH_MISMATCH]: {
        severity: 'HIGH',
        message: 'Evidence integrity hash mismatch detected by registry.',
        action: 'Re-upload the specific evidence exhibits and re-sign the litigation package.'
      },
      [this.SCRUTINY_CODES.SIGNATURE_INVALID]: {
        severity: 'CRITICAL',
        message: 'Digital signature not recognized or invalid.',
        action: 'Perform a fresh Aadhaar eSign session on the complaint.'
      },
      [this.SCRUTINY_CODES.FEE_INSUFFICIENT]: {
        severity: 'MEDIUM',
        message: 'Statutory filing fee is insufficient.',
        action: 'Pay the additional fee amount via the portal and upload the updated receipt.'
      },
      [this.SCRUTINY_CODES.ANNEXURE_MISSING]: {
        severity: 'HIGH',
        message: 'Critical annexures missing from the package.',
        action: 'Review the index of annexures and upload the missing exhibits.'
      },
      [this.SCRUTINY_CODES.JURISDICTION_ERROR]: {
        severity: 'HIGH',
        message: 'Commission jurisdiction challenged by registry.',
        action: 'Recalculate pecuniary claim and select the appropriate Commission (District/State).'
      },
      [this.SCRUTINY_CODES.TSA_INVALID]: {
        severity: 'HIGH',
        message: 'Trusted Timestamp (RFC 3161) not verifiable.',
        action: 'Re-anchor the litigation package to the national TSA to refresh timestamps.'
      },
      [this.SCRUTINY_CODES.UNKNOWN]: {
        severity: 'MEDIUM',
        message: 'Registry deficiency noted.',
        action: 'Please contact the registry office or consult your advocate for specific instructions.'
      }
    };

    return strategies[code] || strategies[this.SCRUTINY_CODES.UNKNOWN];
  }
}

module.exports = new RemediationService();
