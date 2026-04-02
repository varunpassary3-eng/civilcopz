const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getCompanyCatalogue(req, res) {
  try {
    const { category, search, limit = 20 } = req.query;
    
    const where = {};
    if (category) where.category = category;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const companies = await prisma.company.findMany({
      where,
      orderBy: { totalCases: 'desc' },
      take: parseInt(limit),
      include: {
        _count: {
          select: { cases: true }
        }
      }
    });

    // Formatting for the "Newsletter" style frontend
    const catalogue = companies.map(c => ({
      id: c.id,
      name: c.name,
      category: c.category,
      totalComplaints: c.totalCases,
      rating: c.rating,
      shameStatus: c.totalCases > 10 ? 'CRITICAL_OFFENDER' : (c.totalCases > 5 ? 'RECURRING_OFFENDER' : 'TRACKED'),
      trend: 'UP', // Placeholder for actual time-series logic
      lastReported: c.updatedAt
    }));

    return res.json({
      success: true,
      timestamp: new Date(),
      count: catalogue.length,
      companies: catalogue
    });
  } catch (error) {
    console.error('[COMPANY_CATALOGUE_ERROR]', error);
    return res.status(500).json({ error: 'Unable to retrieve company intelligence records' });
  }
}

async function getCompanyStatsSummary(req, res) {
  try {
    const topOffenders = await prisma.company.findMany({
      orderBy: { totalCases: 'desc' },
      take: 5
    });

    const totalTrackedCompanies = await prisma.company.count();
    const totalGrievances = await prisma.case.count();

    return res.json({
      success: true,
      summary: {
        totalGrievances,
        trackedCompanies: totalTrackedCompanies,
        topOffenders: topOffenders.map(o => ({ name: o.name, count: o.totalCases }))
      }
    });
  } catch (error) {
    console.error('[COMPANY_STATS_ERROR]', error);
    return res.status(500).json({ error: 'System error during statistics aggregation' });
  }
}

module.exports = {
  getCompanyCatalogue,
  getCompanyStatsSummary
};
