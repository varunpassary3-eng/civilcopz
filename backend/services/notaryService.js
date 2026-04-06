const dbManager = require('./databaseManager');
const getPrisma = () => dbManager.getReadClient();

/**
 * Notary Service: Judicial Procedural Support
 * Maps jurisdictional context to authorized notarization points.
 */
class NotaryService {
  /**
   * Retrieves a list of authorized notaries for a specific jurisdiction (City/District).
   */
  async getNotariesInJurisdiction(jurisdiction) {
    console.log(`🔍 [NOTARY_ENGINE] Finding authorized witnesses for: ${jurisdiction}`);
    
    // Fallback Mock Data for industrial demo if DB is empty
    const notaries = await getPrisma().notary.findMany({
      where: {
        jurisdiction: {
          contains: jurisdiction,
          mode: 'insensitive'
        }
      }
    });

    if (notaries.length > 0) return notaries;

    // Hardened Mock Substrate: National Consumer Commission Vicinity (Mock)
    return [
      {
        id: 'mock-notary-1',
        name: 'Pratap S. Advocate & Notary Public',
        address: `${jurisdiction} District Court Complex, Block A`,
        contact: '+91 99XXXXXX01',
        fees: 150
      },
      {
        id: 'mock-notary-2',
        name: 'Legal Services Bureau (Authorized Notary)',
        address: `12/A, Civil Lines, Near State Commission, ${jurisdiction}`,
        contact: '+91 88XXXXXX22',
        fees: 100
      }
    ];
  }
}

module.exports = new NotaryService();
