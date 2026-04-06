#!/usr/bin/env node

/**
 * Daily Ledger Hash Generator
 * Run this script daily to create immutable daily ledger hashes
 */

const auditLedgerService = require('../services/auditLedgerService');
const dbManager = require('../services/databaseManager');

async function generateDailyLedger() {
  try {
    console.log('🔐 Generating daily ledger hash...');

    const today = new Date();
    const ledgerEntry = await auditLedgerService.generateDailyLedger(today);

    if (ledgerEntry) {
      console.log(`✅ Daily ledger generated:`);
      console.log(`   Date: ${ledgerEntry.date.toISOString().split('T')[0]}`);
      console.log(`   Root Hash: ${ledgerEntry.rootHash}`);
      console.log(`   Events: ${ledgerEntry.eventCount}`);
    } else {
      console.log('ℹ️ No audit events found for today');
    }

    // Verify recent integrity
    console.log('🔍 Running integrity verification...');
    const recentCases = await getRecentCases();

    for (const caseId of recentCases) {
      const verification = await auditLedgerService.verifyEvidenceChain(caseId);
      if (!verification.isValid) {
        console.error(`❌ Integrity breach in case ${caseId}: ${verification.error}`);
      } else {
        console.log(`✅ Case ${caseId} integrity verified`);
      }
    }

  } catch (error) {
    console.error('❌ Daily ledger generation failed:', error);
    process.exit(1);
  }
}

async function getRecentCases() {
  const prisma = dbManager.getWriteClient();

  try {
    const cases = await prisma.case.findMany({
      where: {
        updatedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      select: { id: true },
      take: 10
    });

    return cases.map(c => c.id);
  } finally {
    // No disconnect on singleton
  }
}

// Run if called directly
if (require.main === module) {
  generateDailyLedger();
}

module.exports = { generateDailyLedger };