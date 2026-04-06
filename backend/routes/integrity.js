const express = require('express');
const auditLedgerService = require('../services/auditLedgerService');
const dbManager = require('../services/databaseManager');

const router = express.Router();
const prisma = dbManager.getWriteClient();

/**
 * Integrity Verification Routes
 * Provides endpoints for verifying audit trails and evidence integrity
 */

// Verify evidence chain for a case
router.get('/case/:caseId/verify', async (req, res) => {
  try {
    const { caseId } = req.params;
    const verification = await auditLedgerService.verifyEvidenceChain(caseId);

    if (verification.isValid) {
      res.json({
        status: 'VERIFIED',
        caseId,
        message: 'Evidence integrity chain is intact',
        entries: verification.entries?.length || 0
      });
    } else {
      res.status(400).json({
        status: 'BREACHED',
        caseId,
        error: verification.error,
        entry: verification.entry
      });
    }
  } catch (error) {
    console.error('Evidence verification failed:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Get audit trail for entity
router.get('/audit/:entityType/:entityId', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const auditTrail = await auditLedgerService.getAuditTrail(entityType, entityId, limit);

    res.json({
      entityType,
      entityId,
      entries: auditTrail,
      count: auditTrail.length
    });
  } catch (error) {
    console.error('Audit trail retrieval failed:', error);
    res.status(500).json({ error: 'Failed to retrieve audit trail' });
  }
});

// Get daily ledger hash
router.get('/ledger/daily/:date', async (req, res) => {
  try {
    const date = new Date(req.params.date);
    const ledger = await prisma.dailyLedgerHash.findUnique({
      where: { date }
    });

    if (!ledger) {
      return res.status(404).json({ error: 'No ledger found for date' });
    }

    res.json(ledger);
  } catch (error) {
    console.error('Ledger retrieval failed:', error);
    res.status(500).json({ error: 'Failed to retrieve ledger' });
  }
});

// Generate daily ledger (admin only)
router.post('/ledger/generate-daily', async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const date = req.body.date ? new Date(req.body.date) : new Date();
    const ledger = await auditLedgerService.generateDailyLedger(date);

    if (!ledger) {
      return res.json({ message: 'No events to ledger for date' });
    }

    res.json({
      message: 'Daily ledger generated',
      ledger
    });
  } catch (error) {
    console.error('Daily ledger generation failed:', error);
    res.status(500).json({ error: 'Failed to generate daily ledger' });
  }
});

// Get integrity verification report
router.get('/integrity/report', async (req, res) => {
  try {
    const report = await auditLedgerService.getIntegrityReport();

    res.json({
      verifications: report,
      total: report.length,
      valid: report.filter(v => v.isValid).length,
      invalid: report.filter(v => !v.isValid).length
    });
  } catch (error) {
    console.error('Integrity report failed:', error);
    res.status(500).json({ error: 'Failed to generate integrity report' });
  }
});

// Verify specific evidence entry
router.get('/evidence/:entryId/verify', async (req, res) => {
  try {
    const { entryId } = req.params;

    const entry = await prisma.evidenceIntegrityLedger.findUnique({
      where: { id: entryId }
    });

    if (!entry) {
      return res.status(404).json({ error: 'Evidence entry not found' });
    }

    const expectedHash = auditLedgerService.generateHash({
      caseId: entry.caseId,
      evidenceId: entry.evidenceId,
      evidenceType: entry.evidenceType,
      contentHash: entry.contentHash,
      metadataHash: entry.metadataHash,
      previousHash: entry.previousHash,
      actor: entry.actor,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent
    });

    const isSignatureValid = await auditLedgerService.verifySignature(expectedHash, entry.signature);

    res.json({
      entryId,
      isValid: isSignatureValid,
      expectedHash,
      actualHash: expectedHash,
      signature: entry.signature.substring(0, 32) + '...' // Truncate for display
    });
  } catch (error) {
    console.error('Evidence verification failed:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

module.exports = router;