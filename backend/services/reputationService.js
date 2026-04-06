const dbManager = require('./databaseManager');

const getPrisma = () => dbManager.getReadClient();

/**
 * CivilCOPZ Reputation Scoring Substrate (Operations-Grade - Phase 11)
 * Weighted Risk Formula: 
 * Score = (Total Complaints * 2) + (Unresolved * 3) + (High Severity * 5)
 */
async function calculateCompanyScore(companyName) {
  try {
    const cases = await getPrisma().case.findMany({
      where: { 
        OR: [
          { company: companyName },
          { companyRef: { name: companyName } }
        ]
      }
    });

    const total = cases.length;
    const unresolved = cases.filter(c => 
      !['Resolved', 'Satisfaction_Confirmed', 'Closed'].includes(c.status)
    ).length;
    const highSeverity = cases.filter(c => c.aiSeverity === 'High' || c.severity === 'High').length;
    const unsatisfied = cases.filter(c => c.satisfaction === 'Unsatisfied').length;

    // Weighting: Total (2), Unresolved (3), High Severity (5), Unsatisfied (10)
    const score = (total * 2) + (unresolved * 3) + (highSeverity * 5) + (unsatisfied * 10);

    // Forensic Neutrality: Labels must be technical risk indicators, not defamatory epithets
    let risk = "Low";
    if (score > 100) risk = "Critical_High_Risk";
    else if (score > 50) risk = "Significant_Systemic_Risk";
    else if (score > 20) risk = "Elevated_Procedural_Risk";
    else if (score > 5) risk = "Moderate_Operational_Risk";

    return {
      company: companyName,
      score,
      risk,
      total,
      unresolved,
      highSeverity,
      unsatisfied,
      lastUpdated: new Date()
    };
  } catch (error) {
    console.error(`[REPUTATION_FAILURE] Error calculating score for ${companyName}:`, error);
    return { error: "Failed to calculate reputation score" };
  }
}

async function getTopRiskCompanies(limit = 5) {
  try {
    const companies = await getPrisma().company.findMany({
      take: limit,
      orderBy: {
        totalCases: 'desc'
      }
    });

    const results = await Promise.all(
      companies.map(c => calculateCompanyScore(c.name))
    );

    return results.sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error('[REPUTATION_FAILURE] Error fetching top risks:', error);
    return [];
  }
}

async function processSatisfaction(companyName, satisfaction) {
  // Real-time recalculation of the company score after satisfaction update
  console.log(`[REPUTATION_UPDATE] Recalculating score for ${companyName} after ${satisfaction} feedback`);
  return calculateCompanyScore(companyName);
}

/**
 * Commercial Eligibility Gate (v8.0)
 * Deterministic check for whether a provider can advertise.
 */
async function isAdEligible(providerId) {
  const prisma = getPrisma();
  const provider = await prisma.advisoryService.findUnique({
    where: { id: providerId }
  });

  if (!provider) return false;

  // Threshold: Minimum score of 75/100 required for commercial visibility
  return provider.isAdEligible && provider.reputationScore >= 75;
}

/**
 * Offender Blacklist (v8.0)
 * Bypasses a company's ad-eligibility if they have critical pending litigation.
 */
async function blackListFromAds(companyId) {
  const prisma = getPrisma();
  
  // Real-time forensic check: If company has > 5 critical unresolved cases, block ads
  const criticalCount = await prisma.case.count({
    where: { 
      companyId,
      status: { notIn: ['Resolved', 'Closed'] },
      aiSeverity: 'High' 
    }
  });

  return criticalCount > 5;
}

module.exports = { 
  calculateCompanyScore, 
  getTopRiskCompanies, 
  processSatisfaction,
  isAdEligible,
  blackListFromAds
};
