const dbManager = require('./databaseManager');
// const reputationService = require('./reputationService'); // Unused currently
const eventLedger = require('./eventLedgerService');

class AdService {
  constructor() {}

  getPrisma() {
    const client = dbManager.getWriteClient();
    if (!client) {
      throw new Error('SUBSTRATE_FRAGMENTATION: Judicial Database client not yet initialized.');
    }
    return client;
  }
  /**
   * Fetch recommended advisory services based on case details
   * @param {string} category - Case category (Banking, Telecom, etc.)
   * @param {string} severity - Case severity (High, Medium, Low)
   */
// eslint-disable-next-line no-unused-vars
  async getRecommendedServices(category, severity) {
    try {
      // Find services matching the category with Reputation Gate (v8.0)
      const services = await this.getPrisma().advisoryService.findMany({
        where: {
          category: {
            equals: category,
            mode: 'insensitive'
          },
          // v8.0 Gate: Only show verified providers with high scores
          reputationScore: { gte: 75 }
        },
        orderBy: [
          { isProBono: 'desc' }, // Prioritize Pro-Bono (v5.0 compliance)
          { reputationScore: 'desc' }, // Then by integrity score
          { createdAt: 'desc' }
        ],
        take: 3
      });

      // v8.0: Record the recommendation event in the forensic ledger
      if (services.length > 0) {
        // We log as a general context match if caseId is not provided in context
        await eventLedger.recordEvent('SYSTEM_WIDE', 'AD_CONTEXT_MATCHED', {
          category,
          serviceCount: services.length,
          providerIds: services.map(s => s.id)
        }, 'SYSTEM', 'AD_ENGINE');
        console.info(`[AD_AUDIT] Context Matched: ${category} | Count: ${services.length}`);
      }

      return services;
    } catch (error) {
      console.error('[AD_SERVICE_ERROR] Failed to fetch recommendations:', error);
      return [];
    }
  }

  /**
   * List all available advisory services with optional filtering
   */
  async listAllServices(filters = {}) {
    const { type, isProBono, category } = filters;
    const where = {};
    if (type) where.type = type;
    if (isProBono !== undefined) where.isProBono = isProBono === 'true';
    if (category) where.category = category;

    try {
      return await this.getPrisma().advisoryService.findMany({
        where,
        orderBy: { name: 'asc' }
      });
    } catch (error) {
      console.error('[AD_SERVICE_ERROR] Failed to list services:', error);
      throw new Error('Unable to retrieve advisory services');
    }
  }

  /**
   * Seed initial advisory services (Administrative/Support)
   */
  async seedInitialServices() {
    const count = await this.getPrisma().advisoryService.count();
    if (count > 0) return;

    const initialServices = [
      {
        name: 'National Legal Aid Clinic',
        type: 'LEGAL_AID',
        description: 'Free legal advice for low-income consumers regarding banking and telecom disputes.',
        category: 'Banking',
        specialization: ['Banking', 'Credit Cards', 'Loans'],
        isProBono: true,
        reputationScore: 100, // v8.0: Max score for Govt Aid
        isAdEligible: true,
        contactEmail: 'support@legalaid.gov.in'
      },
      {
        name: 'Telecom Dispute resolution Group',
        type: 'ADVISORY',
        description: 'Specialized advisory for mobile and broadband billing disputes.',
        category: 'Telecom',
        specialization: ['Billing', 'Service Quality'],
        isProBono: true,
        reputationScore: 98,
        isAdEligible: true,
        contactEmail: 'help@tdrg.org'
      },
      {
        name: 'E-Commerce Rights Forum',
        type: 'PRIVATE_ADVOCATE',
        description: 'Pro bono advocate group for online shopping fraud and refund delays.',
        category: 'E-Commerce',
        specialization: ['Refunds', 'Counterfeit Products'],
        isProBono: true,
        reputationScore: 95,
        isAdEligible: true,
        contactEmail: 'justice@ecommerceforum.in'
      }
    ];

    await this.getPrisma().advisoryService.createMany({
      data: initialServices
    });
  }
}

module.exports = new AdService();
