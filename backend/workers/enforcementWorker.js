const { Queue, Worker } = require('bullmq');
const ioredis = require('ioredis');
const dbManager = require('../services/databaseManager');
const eventLedger = require('../services/eventLedgerService');
const caseLifecycle = require('../services/caseLifecycle');
const socketService = require('../socket');
const ledgerService = require('../services/ledgerService');

const connection = new ioredis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null
});

const getPrisma = () => dbManager.getWriteClient();

/**
 * EnforcementWorker: Autonomous Statutory Engine
 * Monitor statutory 15-day deadlines and execute escalations.
 */
class EnforcementWorker {
  constructor() {
    this.queue = new Queue('EnforcementQueue', { connection });
    
    // Industrial Maintenance Substrate: Daily Judicial Anchoring
    this.queue.add('judicial-maintenance', {}, {
      repeat: { cron: '0 0 * * *' }, // Daily at Midnight
      jobId: 'judicial-nightly-maintenance'
    });

    this.worker = new Worker('EnforcementQueue', async (job) => {
      try {
        if (job.name === 'judicial-maintenance') {
          await this.runJudicialMaintenance();
          return;
        }
        console.log(`[ENFORCEMENT_ENGINE] Processing Expiry Check: ${job.id}`);
        await this.monitorDeadlines();
      } catch (error) {
        console.error(`[ENFORCEMENT_ENGINE] Critical failure in job ${job.id}:`, error);
        throw error; // Trigger retry logic
      }
    }, { connection });

    this.worker.on('failed', (job, err) => {
      console.error(`❌ [ENFORCEMENT_FAILURE] Job ${job.id}:`, err.message);
    });
  }

  /**
   * Verified Statutory Monitor: Queues an automated expiry check.
   */
  async verifyAndQueueExpiry(caseId, deadlineAt) {
    const delay = new Date(deadlineAt).getTime() - Date.now();
    
    if (delay <= 0) {
      await this.handleStatutoryExpiry(caseId);
      return;
    }

    console.log(`📡 [ENFORCEMENT_ENGINE] Monitoring Case ${caseId} | Expiry in ${Math.round(delay/3600000)}h`);
    
    await this.queue.add(
      'check-expiry', 
      { caseId, deadlineAt }, 
      { 
        delay,
        jobId: `expiry-${caseId}`, // Deduplication Key (Industrial Safety)
        attempts: 3,               // Retry Policy
        backoff: {
          type: 'exponential',
          delay: 5000
        },
        removeOnComplete: true
      }
    );
  }

  /**
   * Scans for any active notices that have breached the 15-day statutory period.
   */
  async monitorDeadlines() {
    const now = new Date();

    try {
      const expiredCases = await getPrisma().case.findMany({
        where: {
          status: 'Notice_Sent',
          noticeDeadline: { lte: now },
          noticeStatus: { not: 'EXPIRED' }
        }
      });

      console.log(`[ENFORCEMENT_SCAN] Found ${expiredCases.length} potentially expired notices.`);

      for (const caseData of expiredCases) {
        await this.executeEscalation(caseData);
      }
    } catch (error) {
      console.error('[ENFORCEMENT_SCAN_FAILURE]', error);
    }
  }

  /**
   * Final procedural escalation sequence.
   */
  async executeEscalation(caseData) {
    try {
      console.log(`🚀 [ESCALATION_TRIGGER] Case: ${caseData.id} | Deadline Breached: ${caseData.noticeDeadline}`);

      // 1. Atomically Record Procedural Event (Litigation Ledger)
      await eventLedger.recordEvent(
        caseData.id,
        'NOTICE_EXPIRED',
        { deadlineAt: caseData.noticeDeadline, expiredAt: new Date() },
        'SYSTEM',
        'CRON'
      );

      // Emit Real-Time Telemetry to the UI for instant AFE transition
      socketService.emitUpdate(caseData.id, {
        type: 'NOTICE_EXPIRED_TELEMETRY',
        status: 'EXPIRED',
        reason: 'Statutory 15-day window closed without company resolution.',
        timestamp: new Date().toISOString()
      });

      // 2. Transition Status to Escalated (National Substrate Enforced)
      await caseLifecycle.updateCaseStatus(
        caseData.id,
        'Escalated_to_Authority',
        'System',
        'Statutory 15-day notice period expired without response. Case matured for legal escalation.'
      );

      // 3. Update separate Notice Status for HUD visibility
      await getPrisma().case.update({
        where: { id: caseData.id },
        data: { noticeStatus: 'EXPIRED' }
      });

      console.log(`✅ [ESCALATION_COMPLETE] Case: ${caseData.id} successfully matured to Authority Workflow.`);
    } catch (error) {
      console.error(`❌ [ESCALATION_FAILURE] Case ${caseData.id}:`, error.message);
    }
  }

  /**
   * Industrial Maintenance Substrate: Daily Judicial Root Anchoring
   */
  async runJudicialMaintenance() {
    try {
      console.log('👷 [INDUSTRIAL_MAINTENANCE] Starting Daily Judicial Root Anchoring...');
      const dailyHash = await ledgerService.generateDailyRootHash();
      if (dailyHash) {
        await ledgerService.anchorRootHashExternally(dailyHash);
      }
      console.log('✅ [INDUSTRIAL_MAINTENANCE] Daily Maintenance Sequence Complete.');
    } catch (error) {
      console.error('❌ [INDUSTRIAL_MAINTENANCE] Maintenance failure:', error);
    }
  }
}

module.exports = new EnforcementWorker();
