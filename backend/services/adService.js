const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class AdService {
  /**
   * Fetch recommended advisory services based on case details
   * @param {string} category - Case category (Banking, Telecom, etc.)
   * @param {string} severity - Case severity (High, Medium, Low)
   */
  async getRecommendedServices(category, severity) {
    try {
      // Find services matching the category
      const services = await prisma.advisoryService.findMany({
        where: {
          category: {
            equals: category,
            mode: 'insensitive'
          }
        },
        orderBy: [
          { isProBono: 'desc' }, // Prioritize Pro-Bono for consumer protection
          { createdAt: 'desc' }
        ],
        take: 5
      });

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
      return await prisma.advisoryService.findMany({
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
    const count = await prisma.advisoryService.count();
    if (count > 0) return;

    const initialServices = [
      {
        name: 'National Legal Aid Clinic',
        type: 'LEGAL_AID',
        description: 'Free legal advice for low-income consumers regarding banking and telecom disputes.',
        category: 'Banking',
        specialization: ['Banking', 'Credit Cards', 'Loans'],
        isProBono: true,
        contactEmail: 'support@legalaid.gov.in'
      },
      {
        name: 'Telecom Dispute resolution Group',
        type: 'ADVISORY',
        description: 'Specialized advisory for mobile and broadband billing disputes.',
        category: 'Telecom',
        specialization: ['Billing', 'Service Quality'],
        isProBono: true,
        contactEmail: 'help@tdrg.org'
      },
      {
        name: 'E-Commerce Rights Forum',
        type: 'PRIVATE_ADVOCATE',
        description: 'Pro bono advocate group for online shopping fraud and refund delays.',
        category: 'E-Commerce',
        specialization: ['Refunds', 'Counterfeit Products'],
        isProBono: true,
        contactEmail: 'justice@ecommerceforum.in'
      }
    ];

    await prisma.advisoryService.createMany({
      data: initialServices
    });
  }
}

module.exports = new AdService();
