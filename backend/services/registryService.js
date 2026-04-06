const dbManager = require('./databaseManager');
const filingService = require('./filingService');
const eventLedger = require('./eventLedgerService');
const remediationService = require('./remediationService');
const adapterFactory = require('./stateAdapters');
const archiveService = require('./litigationArchiveService');
const resilienceService = require('./resilienceService');

const getPrisma = () => dbManager.getReadClient();

/**
 * RegistryService: Judicial Port Bridge
 * Automates the submission of litigation packages to India's National Consumer Portals.
 */
class RegistryService {
  /**
   * Submit a sealed case to the e-Daakhil portal.
   */
  async submitToEDaakhil(caseId) {
    const prisma = getPrisma();
    
    // 1. Fetch pre-submission litigation package
    const litigationPackage = await filingService.getLitigationPackage(caseId);
    const caseData = await prisma.case.findUnique({ where: { id: caseId } });

    if (!caseData || (caseData.registryStatus !== 'ACCEPTED' && caseData.reviewStatus !== 'APPROVED')) {
      throw new Error("LITIGATION_PRECONDITION_FAILED: Case must be APPROVED and SIGNED before filing.");
    }

    console.info(`[REGISTRY_BRIDGE] Initiating e-Daakhil submission for Case: ${caseId}`);

    // 2. National Resilience: G2G Circuit Breaker (v10.0)
    const canSubmit = await resilienceService.isG2GAvailable();
    if (!canSubmit) {
      console.error('[RESILIENCE_BLOCK] G2G Circuit Breaker is ACTIVE. Reverting to queue.');
      throw new Error("G2G_CIRCUIT_TRIPPED: Regional gateway instability detected. Please try again later.");
    }

    // 3. Map to e-Daakhil Schema (AFE V3)
    const payload = {
      externalRef: caseId,
      commission: litigationPackage.forum,
      complainant: {
        name: caseData.consumerName,
        address: caseData.consumerAddress,
        contact: caseData.consumerPhone
      },
      documents: {
        complaint: litigationPackage.complaintUrl,
        affidavit: litigationPackage.affidavitUrl,
        vakalatnama: litigationPackage.vakalatnamaUrl,
        exhibits: litigationPackage.exhibits
      },
      filingFee: {
        amount: litigationPackage.statutoryFee,
        mode: 'ONLINE'
      }
    };

    // 4. Selective G2G Egress: National/State Adapter Dispatcher (v9.0)
    const adapter = adapterFactory.getAdapter(litigationPackage.forum);
    const submissionResult = await adapter.submit(payload);

    // 5. Judicial Hardening: Production Archive & Fingerprinting (v9.1/v10.0)
    let archiveUrl = null;
    let archiveKey = null;
    
    if (submissionResult.status === 'SUBMITTED' && submissionResult.rawResponse) {
      const archiveData = await archiveService.archiveRegistryXML(
        caseId, 
        submissionResult.rawResponse, 
        submissionResult.xmlHash
      );
      archiveUrl = archiveData?.url;
      archiveKey = archiveData?.key;
    }

    // 6. Authoritative: Immutable Forensic Snapshot (v5.1.1)
    const crypto = require('crypto');
    const submissionHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');

    // 7. Persist Registry Context (1:N Refactor)
    return await prisma.$transaction(async (tx) => {
      const submission = await tx.caseRegistrySubmission.create({
        data: {
          caseId,
          registryId: submissionResult.registryId,
          diaryNumber: submissionResult.diaryNumber,
          scrutinyStatus: submissionResult.status,
          submissionPayload: payload,    
          submissionHash,                
          responseArchive: submissionResult.rawResponse, 
          archiveUrl: archiveUrl,        // v9.1: Legal S3 Archive (Object Lock)
          archiveKey: archiveKey,        // v10.0: DR Recovery Trace
          xmlHash: submissionResult.xmlHash, // v9.1: National Audit Fingerprint
          schemaVersion: submissionResult.schemaVersion,
          filedAt: new Date()
        }
      });

      await tx.case.update({
        where: { id: caseId },
        data: { registryStatus: submissionResult.status }
      });

      // Record in the Forensic Ledger
      await eventLedger.recordEvent(caseId, 'CASE_FILED_TO_REGISTRY', {
        registryId: submissionResult.registryId,
        diaryNumber: submissionResult.diaryNumber,
        forum: litigationPackage.forum,
        audit: { xmlHash: submissionResult.xmlHash, archiveId: archiveKey }
      }, 'SYSTEM', 'REGISTRY_BRIDGE', tx);

      return submission;
    });
  }

  /**
   * Poll Registry for Scrutiny Updates
   */
  async pollRegistryStatus(caseId) {
    const prisma = getPrisma();
    const submission = await prisma.caseRegistrySubmission.findFirst({ 
      where: { caseId },
      orderBy: { filedAt: 'desc' }
    });
    
    if (!submission || !submission.registryId) return null;

    // SIMULATION: Transition SUBMITTED -> ACCEPTED or DEFICIENCY
    const newState = Math.random() > 0.8 ? 'DEFICIENCY' : 'ACCEPTED';
    const notes = newState === 'DEFICIENCY' ? 'Annexure-B integrity hash mismatch. Please re-upload.' : 'Scrutiny complete. Pending Final Registration Number.';
    
    const updated = await prisma.caseRegistrySubmission.update({
      where: { id: submission.id },
      data: {
        scrutinyStatus: newState,
        scrutinyNotes: notes,
        lastPollAt: new Date(),
        registrationNumber: newState === 'ACCEPTED' ? `CP-${Date.now()}-REG` : undefined
      }
    });

    if (newState === 'ACCEPTED') {
      await prisma.case.update({
        where: { id: caseId },
        data: { registryStatus: 'REGISTERED' }
      });
    }

    return updated;
  }
}

module.exports = new RegistryService();
