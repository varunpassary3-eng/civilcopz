const request = require('supertest');
const { app, server } = require('../../backend/server');
const dbManager = require('../../backend/services/databaseManager');

jest.mock('../../backend/services/databaseManager', () => {
    const actual = jest.requireActual('../../backend/services/databaseManager');
    return {
        ...actual,
        getWriteClient: jest.fn(),
        getReadClient: jest.fn(),
        initialize: jest.fn().mockResolvedValue(true)
    };
});

describe('Adversarial Litigation Scenario: Hostile Company Resistance', () => {
    let mockPrisma;
    let authHeader = 'Bearer mock-token';

    beforeAll(() => {
        mockPrisma = {
            case: { 
                create: jest.fn(), 
                findUnique: jest.fn(), 
                update: jest.fn(),
                findMany: jest.fn()
            },
            caseEvent: { create: jest.fn(), findFirst: jest.fn() },
            evidenceIntegrityLedger: { create: jest.fn(), findFirst: jest.fn() },
            $transaction: jest.fn(cb => cb(mockPrisma))
        };
        dbManager.getWriteClient.mockReturnValue(mockPrisma);
        dbManager.getReadClient.mockReturnValue(mockPrisma);
    });

    afterAll((done) => {
        server.close(done);
    });

    test('Should automatically escalate despite company non-response after statutory period', async () => {
        const caseId = 'ADVERSARIAL-001';
        const pastDeadline = new Date(Date.now() - 1000 * 60 * 60 * 24 * 16); // 16 days ago

        // 1. Setup: Case is in Notice_Sent status with a past deadline
        mockPrisma.case.findMany.mockResolvedValue([
            { id: caseId, status: 'Notice_Sent', noticeDeadline: pastDeadline, noticeStatus: 'SENT' }
        ]);

        // 2. Trigger: Enforcement Worker runs (Autonomous Statutory Engine)
        const enforcementWorker = require('../../backend/workers/enforcementWorker');
        await enforcementWorker.monitorDeadlines();

        // 3. Validation: System must have escalated the case automatically
        // This is verified via check on mockPrisma.case.update or caseLifecycle mock
        expect(mockPrisma.case.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: caseId },
            data: expect.objectContaining({ noticeStatus: 'EXPIRED' })
        }));
    });

});
