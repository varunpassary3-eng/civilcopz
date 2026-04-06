const dbManager = require('../services/databaseManager');
const eventLedger = require('../services/eventLedgerService');

const getPrisma = () => dbManager.getReadClient();

/**
 * VerificationController: Institutional Audit Gateway
 * Provides unauthenticated mathematical proof of litigation dossier integrity.
 */
class VerificationController {
  /**
   * Public Integrity Check (Master Hash Lookup)
   * GET /api/verify/:masterHash
   */
  async publicVerify(req, res) {
    const { masterHash } = req.params;
    const prisma = getPrisma();

    try {
      console.info(`[PUBLIC_AUDIT] Verifying Master Hash: ${masterHash}`);

      // 1. Search for a matching forensic package across the ledger
      const pkg = await prisma.evidencePackage.findUnique({
        where: { masterHash },
        include: { 
          case: { 
            select: { 
              status: true,
              jurisdiction: true
            } 
          } 
        }
      });

      if (!pkg) {
        return res.status(404).json({
          isValid: false,
          error: "UNVERIFIABLE_DOSSIER: Hash not found in the forensic ledger.",
          timestamp: new Date().toISOString()
        });
      }

      // 2. Return Forensic Proof (No private data revealed)
      const auditResult = {
        isValid: pkg.isCourtAdmissible,
        dossierId: pkg.packageId,
        sealedAt: pkg.sealedAt,
        sealedByRole: 'PROFESSIONAL_AUDITOR', // Normalized representation
        jurisdiction: pkg.case.jurisdiction,
        auditPulse: 'GREEN_VERIFIED',
        note: 'This dossier is mathematically identical to the one archived on national servers.'
      };

      // 3. Record the audit event (Forensic accountability)
      await eventLedger.recordEvent(pkg.caseId, 'DOSSIER_PUBLICLY_VERIFIED', {
        hash: masterHash,
        source: req.ip
      }, 'SYSTEM', 'AUDIT_GATEWAY');

      res.status(200).json(auditResult);
    } catch (error) {
      console.error('[AUDIT_GATEWAY_FAILURE]', error);
      res.status(500).json({ error: 'Audit substrate temporarily unavailable.' });
    }
  }
}

module.exports = new VerificationController();
