const enforcementWorker = require('../../backend/workers/enforcementWorker');
const dbManager = require('../../backend/services/databaseManager');
const caseLifecycle = require('../../backend/services/caseLifecycle');

// Mock Prisma Client and CaseLifecycle
jest.mock('../../backend/services/databaseManager', () => ({
  getWriteClient: jest.fn()
}));
jest.mock('../../backend/services/caseLifecycle', () => ({
  updateCaseStatus: jest.fn()
}));
jest.mock('../../backend/socket', () => ({
  emitUpdate: jest.fn()
}));

describe('Statutory Enforcement Substrate (Worker)', () => {
    let mockPrisma;

    beforeEach(() => {
        mockPrisma = {
            case: {
                findMany: jest.fn(),
                update: jest.fn()
            }
        };
        dbManager.getWriteClient.mockReturnValue(mockPrisma);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should identify and escalate expired cases', async () => {
        const expiredCaseId = 'CASE-EXP-001';
        const pastDeadline = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
        
        mockPrisma.case.findMany.mockResolvedValue([
            { id: expiredCaseId, status: 'Notice_Sent', noticeDeadline: pastDeadline, noticeStatus: 'SENT' }
        ]);

        await enforcementWorker.monitorDeadlines();

        // 1. Verify status transition
        expect(caseLifecycle.updateCaseStatus).toHaveBeenCalledWith(
          expiredCaseId, 
          'Escalated_to_Authority', 
          'System', 
          expect.any(String)
        );

        // 2. Verify noticeStatus update
        expect(mockPrisma.case.update).toHaveBeenCalledWith({
          where: { id: expiredCaseId },
          data: { noticeStatus: 'EXPIRED' }
        });
    });

    test('should ignore cases within the statutory window', async () => {
        const futureDeadline = new Date(Date.now() + 1000 * 60 * 60 * 24 * 10); // 10 days in future
        mockPrisma.case.findMany.mockResolvedValue([]); // FindMany will have filter for lte: now

        await enforcementWorker.monitorDeadlines();
        expect(caseLifecycle.updateCaseStatus).not.toHaveBeenCalled();
    });

    test('should be idempotent (multiple cron runs should not duplicate events)', async () => {
        const caseId = 'CASE-IDEM-007';
        const pastDeadline = new Date(Date.now() - 1000 * 60 * 60);

        // First Run
        mockPrisma.case.findMany.mockResolvedValueOnce([
            { id: caseId, status: 'Notice_Sent', noticeDeadline: pastDeadline, noticeStatus: 'SENT' }
        ]);

        await enforcementWorker.monitorDeadlines();

        // Second Run (Simulating consecutive cron triggers)
        // After first run, status reflects EXPIRED (on success), so findMany should filter it out
        mockPrisma.case.findMany.mockResolvedValueOnce([]); 

        await enforcementWorker.monitorDeadlines();

        // Validate: updateCaseStatus only called ONCE despite multiple cron iterations
        expect(caseLifecycle.updateCaseStatus).toHaveBeenCalledTimes(1);
    });

});
