const { PrismaClient } = require('@prisma/client');
const aiQueue = require('../queue/aiQueue');
const aiService = require('../services/aiService');

const prisma = new PrismaClient();

const DEFAULT_PAGE_SIZE = 10;

async function getCases(req, res) {
  try {
    const { page = 1, limit = DEFAULT_PAGE_SIZE, search, category, status } = req.query;
    const skip = (page - 1) * limit;
    const take = parseInt(limit);

    const where = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) where.category = category;
    if (status) where.status = status;

    const [cases, total] = await Promise.all([
      prisma.case.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.case.count({ where }),
    ]);

    return res.json({
      cases,
      pagination: {
        page: parseInt(page),
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('getCases error', error);
    return res.status(500).json({ error: 'Unable to retrieve cases' });
  }
}

async function getCaseById(req, res) {
  const { id } = req.params;
  try {
    const caseItem = await prisma.case.findUnique({ where: { id } });
    if (!caseItem) {
      return res.status(404).json({ error: 'Case not found' });
    }
    return res.json(caseItem);
  } catch (error) {
    console.error('getCaseById error', error);
    return res.status(500).json({ error: 'Unable to retrieve case' });
  }
}

async function createCase(req, res) {
  try {
    const { title, description, company, category, jurisdiction } = req.validatedData;
    const filePath = req.file ? req.file.path : null;

    // Find or create company
    let companyRecord = await prisma.company.findUnique({
      where: { name: company }
    });

    if (!companyRecord) {
      companyRecord = await prisma.company.create({
        data: {
          name: company,
          category: category || 'Other',
          totalCases: 1
        }
      });
    } else {
      await prisma.company.update({
        where: { id: companyRecord.id },
        data: { totalCases: { increment: 1 } }
      });
    }

    // Create case within a transaction-safe manner
    const newCase = await prisma.case.create({
      data: {
        title,
        description,
        company,
        companyId: companyRecord.id,
        category: category || 'Other',
        jurisdiction,
        status: 'Pending',
        filePath,
        reporter: req.user ? { connect: { id: req.user.id } } : undefined,
        timeline: {
          create: {
            action: 'Grievance Filed',
            status: 'Pending'
          }
        }
      },
      include: { timeline: true }
    });

    // Queue AI classification job (async processing)
    let aiQueued = false;
    try {
      await aiQueue.add('classify-case', {
        caseId: newCase.id,
        description: newCase.description,
        title: newCase.title,
        company: newCase.company
      });
      aiQueued = true;
    } catch (queueError) {
      console.error(`[AI_QUEUE_FAILURE] Case: ${newCase.id} - Error:`, queueError);
      // Log for manual reconciliation if needed
    }

    return res.status(201).json({
      success: true,
      case: newCase,
      aiQueued,
      message: aiQueued 
        ? 'Case created successfully. AI classification in progress.' 
        : 'Case created. AI classification pending (system busy).'
    });

  } catch (error) {
    console.error('[CREATE_CASE_ERROR]', error);
    return res.status(500).json({ error: 'System encountered an error creating the case. Please try again.' });
  }
}

async function updateCaseStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['Pending', 'Review', 'Resolved'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const updated = await prisma.case.update({
      where: { id },
      data: { 
        status,
        timeline: {
          create: {
            action: `Status updated to ${status}`,
            status: status
          }
        }
      },
      include: { timeline: true }
    });
    return res.json({
      success: true,
      message: 'Case status updated successfully',
      case: updated
    });
  } catch (error) {
    console.error(`[UPDATE_STATUS_ERROR] Case: ${id}`, error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Case not found for update' });
    }
    return res.status(500).json({ error: 'Internal system error during status update' });
  }
}

async function companyStats(req, res) {
  try {
    const groups = await prisma.case.groupBy({
      by: ['company'],
      _count: { company: true },
      orderBy: { _count: { company: 'desc' } },
      take: 5,
    });
    return res.json(groups.map(item => ({ company: item.company, count: item._count.company })));
  } catch (error) {
    console.error('companyStats error', error);
    return res.status(500).json({ error: 'Unable to retrieve company stats' });
  }
}

module.exports = {
  getCases,
  getCaseById,
  createCase,
  updateCaseStatus,
  companyStats,
};
