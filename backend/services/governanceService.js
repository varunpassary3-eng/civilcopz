/**
 * CivilCOPZ Governance Substrate: Pecuniary Jurisdiction Engine (CPA 2019)
 * Section 35: Standardizes the 'Expected -> Verified -> Final' claim model.
 */
class GovernanceService {
  /**
   * Pecuniary Thresholds (CPA 2019 - Revised 2021)
   */
  get THRESHOLDS() {
    return {
      DISTRICT: 5000000,    // 50 Lakh
      STATE: 20000000,     // 2 Crore
      NATIONAL: Infinity
    };
  }

  /**
   * Maps a claim value to the correct jurisdictional forum.
   * @param {number} totalValue - Consideration + Compensation
   */
  mapForum(totalValue) {
    if (totalValue <= this.THRESHOLDS.DISTRICT) return 'District Consumer Disputes Redressal Commission';
    if (totalValue <= this.THRESHOLDS.STATE) return 'State Consumer Disputes Redressal Commission';
    return 'National Consumer Disputes Redressal Commission (NCDRC)';
  }

  /**
   * Provides procedural advisory on compensation realism.
   * @param {number} consideration - Actual amount paid
   * @param {number} compensation - Claimed amount
   */
  getAdvisory(consideration, compensation) {
    const ratio = compensation / (consideration || 1);
    if (ratio >= 5) {
      return {
        level: 'CRITICAL',
        message: 'Compensation exceeds 5x consideration. This high ratio may be contested as "unrealistic" during court merit review.'
      };
    }
    if (ratio >= 2) {
      return {
        level: 'WARNING',
        message: 'Compensation appears disproportionately high. Advocates typically recommend a 1x-2x ratio for mental agony to ensure court acceptance.'
      };
    }
    return { level: 'STABLE', message: 'Compensation ratio is within standard litigation norms.' };
  }

  /**
   * Calculates Statutory Filing Fee as per Rule 7, CP Rules 2020.
   * @param {number} totalValue 
   */
  calculateFilingFee(totalValue) {
    if (totalValue <= 500000) return 0;
    if (totalValue <= 1000000) return 200;
    if (totalValue <= 2000000) return 400;
    if (totalValue <= 5000000) return 1000;
    if (totalValue <= 10000000) return 2000;
    if (totalValue <= 20000000) return 2500;
    if (totalValue <= 40000000) return 4000;
    if (totalValue <= 60000000) return 6000;
    if (totalValue <= 100000000) return 7500;
    return 10000;
  }

  /**
   * Formats the litigation-ready pecuniary snapshot.
   */
  getPecuniarySnapshot(caseData) {
    const consideration = caseData.considerationPaid || 0;
    const clientClaim = caseData.expectedCompensationClient || 0;
    const advocateClaim = caseData.proposedCompensationAdvocate || clientClaim;
    const total = consideration + advocateClaim;

    return {
      considerationPaid: consideration,
      expectedCompensationClient: clientClaim,
      proposedCompensationAdvocate: advocateClaim,
      finalCourtClaimValue: total,
      forum: this.mapForum(total),
      statutoryFee: this.calculateFilingFee(total),
      advisory: this.getAdvisory(consideration, advocateClaim)
    };
  }
}

module.exports = new GovernanceService();
