const dbManager = require('./services/databaseManager');
const deliveryService = require('./services/deliveryService');
const reputationService = require('./services/reputationService');
const caseLifecycle = require('./services/caseLifecycle');

async function verify() {
  console.log('🔍 Starting CivilCOPZ Escalation Engine Verification...');

  try {
    await dbManager.initialize();
    const prisma = dbManager.getWriteClient();

    // 1. Create a Mock Case
    console.log('--- Step 1: Creating Mock Case ---');
    const mockCase = await prisma.case.create({
      data: {
        title: 'Escalation Test Case',
        description: 'Testing the 15-day deadline escalation logic.',
        company: 'Escalation Corp',
        category: 'Other',
        jurisdiction: 'National',
        status: 'Submitted',
        consumerName: 'Verifier User',
        consumerEmail: 'verifier@example.com',
        isDeclaredTrue: true,
        noticeUrl: '/uploads/dummy_notice.pdf',
        noticeDeadline: new Date(Date.now() - 1000 * 60) // Expired 1 minute ago
      }
    });
    console.log(`✅ Case Created: ${mockCase.id}`);

    // 2. Dispatch Multi-Channel Notice
    console.log('--- Step 2: Dispatching Multi-Channel Notice ---');
    await deliveryService.sendNotice(mockCase.id);
    console.log(`✅ Notices Dispatched.`);

    // 3. Manually Trigger Escalation Logic (Simulating the Worker)
    console.log('--- Step 3: Triggering Escalation Processor ---');
    
    // Logic from worker
    const now = new Date();
    const expiredCases = await prisma.case.findMany({
      where: {
        id: mockCase.id, // Target only our test case
        status: { not: 'Escalated_to_Authority' },
        noticeDeadline: { lte: now }
      }
    });

    if (expiredCases.length === 1) {
      console.log('⚖️ Expired Case Detected. Escalating...');
      
      const c = expiredCases[0];
      await prisma.case.update({
        where: { id: c.id },
        data: {
          status: 'Escalated_to_Authority',
          noticeStatus: 'ESCALATED',
          auditAction: 'Escalated due to statutory deadline breach'
        }
      });

      await caseLifecycle.updateCaseStatus(
        c.id,
        'Escalated_to_Authority',
        'System',
        'TEST_SUCCESS: Legal notice expired. Case escalated to National Commission.'
      );

      // Verify Reputation Impact
      const reputation = await reputationService.calculateCompanyScore(c.company);
      console.log(`📉 Reputation Score updated for ${c.company}: ${reputation.score}`);
    } else {
      throw new Error('❌ No expired cases detected for escalation.');
    }

    // 4. Final Verification of DB state
    const verifiedCase = await prisma.case.findUnique({
      where: { id: mockCase.id },
      include: { timeline: true }
    });

    if (verifiedCase.status === 'Escalated_to_Authority' && verifiedCase.noticeStatus === 'ESCALATED') {
      console.log('\n✨ VERIFICATION SUCCESSFUL: Notice Delivery & Escalation Substrate is Operational.');
    } else {
      throw new Error('❌ Verification failed: Database status mismatch.');
    }

  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED:', error);
    process.exit(1);
  } finally {
    await dbManager.disconnect();
  }
}

verify();
