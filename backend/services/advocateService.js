const dbManager = require('./databaseManager');
const filingService = require('./filingService');
const eventLedger = require('./eventLedgerService');

const getPrisma = () => dbManager.getReadClient();

/**
 * AdvocateService: Professional Representation Substrate
 * Manages the transition from direct-litigation to professional representation.
 */
class AdvocateService {
  /**
   * Verifies an Advocate's Bar Council ID against the (simulated) BCI registry.
   */
  async verifyBarCouncilId(barCouncilId) {
    console.info(`[ADVOCATE_VERIFICATION] Handshaking with BCI for: ${barCouncilId}`);
    
    // SIMULATION: 95% pass rate for valid-format IDs (e.g., MAH/123/2020)
    await new Promise(resolve => setTimeout(resolve, 600));
    const isValidFormat = /^[A-Z]{2,3}\/\d{1,6}\/\d{4}$/.test(barCouncilId);
    
    return {
      verified: isValidFormat && Math.random() > 0.05,
      provider: 'Bar Council of India (MOCK)',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generates the multi-party Vakalatnama (Power of Attorney).
   */
  async generateVakalatnama(caseId, clientId, advocateId) {
    const prisma = getPrisma();
    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      include: { advocate: true, reporter: true }
    });

    if (!caseData || !caseData.advocate) {
      throw new Error("REPRESENTATION_CONTEXT_MISSING: Case must have an assigned advocate.");
    }

    // This creates the specialized PDF for dual signatures
    // In AFE V3, this will be a PDF-Kit generation with two signing zones
    const pkg = await filingService.getLitigationPackage(caseId);
    
    console.info(`[VAKALATNAMA_GEN] Creating digital POA for Case: ${caseId}`);
    
    // Simulate generation path
    const vakalatnamaUrl = `/uploads/Vakalatnama_${caseId}.pdf`;

    await prisma.case.update({
      where: { id: caseId },
      data: { 
        vakalatnamaUrl,
        representationStatus: 'REQUESTED' 
      }
    });

    return vakalatnamaUrl;
  }

  /**
   * Finalizes the assignment after successful Vakalatnama signing.
   */
  async finalizeRepresentation(caseId) {
    const prisma = getPrisma();
    
    return await prisma.$transaction(async (tx) => {
      const updatedCase = await tx.case.update({
        where: { id: caseId },
        data: { representationStatus: 'ACCEPTED' }
      });

      await eventLedger.recordEvent(caseId, 'ADVOCATE_ASSIGNED', {
        advocateId: updatedCase.advocateId,
        status: 'OFFICIALLY_REPRESENTED'
      }, 'SYSTEM', 'ADVOCACY_SERVICE', tx);

      return updatedCase;
    });
  }
}

module.exports = new AdvocateService();
