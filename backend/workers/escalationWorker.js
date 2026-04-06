const { Worker } = require('bullmq');
const dbManager = require('../services/databaseManager');
const reputationService = require('../services/reputationService');
const caseLifecycle = require('../services/caseLifecycle');

const getPrisma = () => dbManager.getWriteClient();

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
};

/**
 * Escalation Engine Worker
 * Logic: Monitor notice deadlines and auto-escalate non-compliant companies.
 */
const escalationWorker = new Worker('escalation-engine', async (job) => {
  if (job.name === 'monitor-deadlines') {
    console.log('🔍 [ESCALATION_ENGINE] Scanning for expired notice deadlines...');

    const now = new Date();
    
    // Find cases in Notice_Sent status that are past the noticeDeadline
    const expiredCases = await getPrisma().case.findMany({
      where: {
        status: 'Notice_Sent',
        noticeDeadline: {
          lte: now
        },
        noticeStatus: {
          not: 'ESCALATED'
        }
      },
      include: {
        companyRef: true
      }
    });

    console.log(`⚖️ [ESCALATION_ENGINE] Found ${expiredCases.length} cases for escalation.`);

    for (const c of expiredCases) {
      try {
        await escalateCase(c);
      } catch (err) {
        console.error(`❌ [ESCALATION_FAILURE] Case: ${c.id}`, err.message);
      }
    }
  }
}, { connection });

/**
 * Escalate a single case to the Authority level.
 */
async function escalateCase(caseData) {
  console.log(`➡️ [ESCALATING] Case: ${caseData.id} | Deadline: ${caseData.noticeDeadline}`);

  // 1. Update Case Status & noticeStatus
  await getPrisma().case.update({
    where: { id: caseData.id },
    data: {
      status: 'Escalated_to_Authority',
      noticeStatus: 'ESCALATED',
      auditAction: 'Escalated due to statutory deadline breach'
    }
  });

  // 2. Log in Timeline
  await caseLifecycle.updateCaseStatus(
    caseData.id,
    'Escalated_to_Authority',
    'System',
    'NOTICE EXPIRED: Company failed to respond within 15-day statutory period. Escalating to National Consumer Commission oversight.'
  );

  // 3. Recalculate Reputation Score (Penalty +15)
  if (caseData.company) {
    await reputationService.calculateCompanyScore(caseData.company);
    console.log(`📉 [REPUTATION_PENALTY] Penalty applied to ${caseData.company}`);
  }

  // 4. (Optional) Dispatch Escalation Alert to Consumer
  // dispatchEscalationNotification(caseData);
}

escalationWorker.on('completed', (job) => {
  console.log(`✅ [ESCALATION_ENGINE] Job completed: ${job.id}`);
});

escalationWorker.on('failed', (job, err) => {
  console.error(`❌ [ESCALATION_ENGINE] Job failed: ${job.id}`, err.message);
});

module.exports = escalationWorker;
