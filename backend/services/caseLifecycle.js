const dbManager = require('./databaseManager');
const socketService = require('../socket');
const alertingService = require('./alertingService');

const getPrisma = () => dbManager.getWriteClient();

/**
 * Updates case status, creates timeline entry, and emits real-time update.
 * @param {string} caseId - ID of the case
 * @param {string} status - New CaseStatus enum value
 * @param {string} actor - Who performed the action (e.g., 'Admin', 'AI', 'System')
 * @param {string} actionDescription - Optional custom action description
 */
async function updateCaseStatus(caseId, status, actor, actionDescription = null) {
  const prisma = getPrisma();

  // Validate status transition (optional, but good for production)
  // For now, we trust the caller as it's an internal service

  const updatedCase = await prisma.case.update({
    where: { id: caseId },
    data: {
      status,
      timeline: {
        create: {
          action: actionDescription || `Status changed to ${status.replace(/_/g, ' ')}`,
          status,
          actor
        }
      }
    },
    include: {
      timeline: true,
      reporter: true
    }
  });

  // Emit real-time update to the specific case room (private to the user/admins joining that room)
  socketService.emitUpdate(caseId, {
    caseId,
    status,
    timestamp: new Date().toISOString(),
    actor
  });

  // If it's a final order, we might want to publish for reputation (depending on business logic)
  if (status === 'Judgment_Issued' || status === 'Resolved') {
    socketService.emitPublicUpdate({
        caseId,
        company: updatedCase.company,
        status,
        message: `Final Resolution reached for a case against ${updatedCase.company}`,
        timestamp: new Date().toISOString()
    });
  }

  // Log alert for monitoring
  alertingService.sendAlert({
    type: 'info',
    severity: 'low',
    title: 'Case Lifecycle Transition',
    description: `Case ${caseId} transitioned to ${status} by ${actor}`,
    source: 'case_lifecycle_service'
  }).catch(console.error);

  return updatedCase;
}

/**
 * Updates user satisfaction for a resolved case.
 * @param {string} caseId 
 * @param {string} satisfaction - 'Satisfied' | 'Unsatisfied'
 */
async function setSatisfaction(caseId, satisfaction) {
    const prisma = getPrisma();
    
    const updatedCase = await prisma.case.update({
        where: { id: caseId },
        data: { 
            satisfaction,
            status: 'Satisfaction_Confirmed'
        },
        include: {
            timeline: true
        }
    });

    // Add timeline entry for satisfaction
    await prisma.caseTimeline.create({
        data: {
            caseId,
            action: `User confirmed satisfaction: ${satisfaction}`,
            status: 'Satisfaction_Confirmed',
            actor: 'User'
        }
    });

    // Impact reputation score logic (deferred to reputationService)
    const reputationService = require('./reputationService');
    await reputationService.processSatisfaction(updatedCase.company, satisfaction);

    return updatedCase;
}

module.exports = {
  updateCaseStatus,
  setSatisfaction
};
