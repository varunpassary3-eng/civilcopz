const dbManager = require('../services/databaseManager');
const prisma = dbManager.getWriteClient();

/**
 * migrateRegistry.js: Staged Cardinality Migration (v5.1.1)
 * Migrates Cases from 1:1 registrySubmission to 1:N registrySubmissions[].
 */
async function migrate() {
  console.info("🚨 [MIGRATION_START] Initiating 1:1 to 1:N Registry Backfill.");
  
  try {
    // 1. Fetch cases with legacy 1:1 submissions
    const casesWithLegacy = await prisma.case.findMany({
      where: { legacySubmissionId: { not: null } },
      include: { legacySubmission: true }
    });

    console.info(`📊 [DATA_SCAN] Found ${casesWithLegacy.length} cases requiring backfill.`);

    for (const c of casesWithLegacy) {
      if (c.legacySubmission) {
        // Atomic check: Ensure we don't duplicate on re-runs
        const existing = await prisma.caseRegistrySubmission.findFirst({
          where: { 
            caseId: c.id, 
            diaryNumber: c.legacySubmission.diaryNumber 
          }
        });

        if (!existing) {
          await prisma.caseRegistrySubmission.create({
            data: {
              caseId: c.id,
              registryId: c.legacySubmission.registryId,
              diaryNumber: c.legacySubmission.diaryNumber,
              registrationNumber: c.legacySubmission.registrationNumber,
              scrutinyStatus: c.legacySubmission.scrutinyStatus,
              scrutinyNotes: c.legacySubmission.scrutinyNotes,
              filedAt: c.legacySubmission.filedAt
            }
          });
          console.info(`✅ [BACKFILL_OK] Case: ${c.id} | Linkage established.`);
        } else {
          console.info(`⏩ [BACKFILL_SKIP] Case: ${c.id} | Linkage already exists.`);
        }
      }
    }

    // 2. INTEGRITY AUDIT (Step 3: Mismatch Check)
    console.info("🔍 [INTEGRITY_AUDIT] Verifying linkage consistency...");
    const mismatches = await prisma.case.count({
      where: {
        registrySubmissions: { none: {} },
        legacySubmissionId: { not: null }
      }
    });

    if (mismatches === 0) {
      console.info("✅ [AUDIT_PASSED] 100% linkage integrity achieved. Safe to proceed to Step 4.");
    } else {
      console.error(`❌ [AUDIT_FAILED] ${mismatches} orphaned linkages detected. DO NOT drop legacy columns.`);
    }

  } catch (error) {
    console.error("❌ [MIGRATION_CRITICAL_FAILURE]", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  migrate();
}
