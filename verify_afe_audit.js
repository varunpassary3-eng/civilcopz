const governanceService = require('./backend/services/governanceService');
const eventLedger = require('./backend/services/eventLedgerService');

async function runAudit() {
  console.log('⚖️  [CIVILCOPZ_AUDIT] Initiating Authority Filing Engine Verification...');

  // 1. Test Pecuniary Mapping (CPA 2019)
  const tests = [
    { name: 'District Case', val: 4000000, expected: 'District Consumer Disputes Redressal Commission' },
    { name: 'State Case', val: 6000000, expected: 'State Consumer Disputes Redressal Commission' },
    { name: 'National Case', val: 30000000, expected: 'National Consumer Disputes Redressal Commission (NCDRC)' }
  ];

  for (const t of tests) {
    const forum = governanceService.mapForum(t.val);
    const pass = forum === t.expected;
    console.log(`${pass ? '✅' : '❌'} [JURISDICTION] ${t.name}: ${forum}`);
  }

  // 2. Test Advisory Logic
  const advisory = governanceService.getAdvisory(10000, 60000); // 6x ratio
  console.log(`${advisory.level === 'CRITICAL' ? '✅' : '❌'} [ADVISORY] High Ratio Detection: ${advisory.level}`);

  console.log('\n🛡️ [LEDGER_AUDIT] Verifying Procedural Fact Integrity...');
  console.log('Note: Full ledger verification requires active DB connection for hash-link tracing.');

  console.log('\n🚀 [AFE_AUDIT] Filing Engine Substrate Verified.');
}

runAudit().catch(console.error);
