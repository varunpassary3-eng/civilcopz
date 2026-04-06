const dbManager = require('../services/databaseManager');
const advocateService = require('../services/advocateService');
const eventLedger = require('../services/eventLedgerService');

const getPrisma = () => dbManager.getReadClient();

/**
 * AdvocateController: Professional Discovery & Assignment Orchestrator
 * Manages the legal-handshake between Client and Counsel.
 */
class AdvocateController {
  /**
   * Allows a Consumer to request professional representation.
   */
  async requestCounsel(req, res) {
    const { caseId, advocateId } = req.body;
    const { userId } = req.user; // Consumer's ID from auth middleware
    const prisma = getPrisma();

    try {
      console.info(`[ADVOCACY_REQUEST] Case: ${caseId} | Requesting Advocate: ${advocateId}`);

      const advocate = await prisma.user.findUnique({ where: { id: advocateId } });
      if (!advocate || advocate.role !== 'advocate') {
        throw new Error("INVALID_ADVOCATE_ID: User is not registered as an advocate.");
      }

      const updatedCase = await prisma.case.update({
        where: { id: caseId, reporterId: userId },
        data: {
          advocateId,
          representationStatus: 'REQUESTED'
        }
      });

      await eventLedger.recordEvent(caseId, 'ADVOCATE_REQUESTED', {
        advocateId,
        advocateName: advocate.email
      }, 'USER', 'ADVOCACY_HANDSHAKE');

      res.status(200).json({ 
        message: "Counsel requested. Pending advocate acceptance.",
        representationStatus: updatedCase.representationStatus 
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Allows a Professional to accept a brief and trigger Vakalatnama generation.
   */
  async acceptBrief(req, res) {
    const { caseId } = req.params;
    const { userId } = req.user; // Advocate's ID from auth middleware
    const prisma = getPrisma();

    try {
      const caseData = await prisma.case.findUnique({ where: { id: caseId } });
      if (caseData.advocateId !== userId) {
        throw new Error("UNAUTHORIZED: You are not assigned to this brief.");
      }

      // 1. Verify Professional Status
      const advocate = await prisma.user.findUnique({ where: { id: userId } });
      if (!advocate.isVerifiedProfessional) {
        throw new Error("VERIFICATION_REQUIRED: You must verify your Bar Council ID before accepting briefs.");
      }

      // 2. Accept and Generate Digital POA (Vakalatnama)
      const vakalatnamaUrl = await advocateService.generateVakalatnama(caseId, caseData.reporterId, userId);

      await eventLedger.recordEvent(caseId, 'BRIEF_ACCEPTED', {
        advocateId: userId,
        vakalatnamaGenerated: true
      }, 'USER', 'ADVOCACY_HANDSHAKE');

      res.status(200).json({ 
        message: "Brief accepted. Vakalatnama generated and ready for client signature.",
        vakalatnamaUrl 
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Triggers the Bar Council ID verification substrate.
   */
  async verifyProfessional(req, res) {
    const { userId } = req.user;
    const { barCouncilId } = req.body;
    const prisma = getPrisma();

    try {
      const verification = await advocateService.verifyBarCouncilId(barCouncilId);
      
      if (verification.verified) {
        await prisma.user.update({
          where: { id: userId },
          data: { 
            barCouncilId,
            isVerifiedProfessional: true 
          }
        });
      }

      res.status(200).json(verification);
    } catch (error) {
      res.status(500).json({ error: 'Professional verification failed.' });
    }
  }
}

module.exports = new AdvocateController();
