const enforcementWorker = require('../../backend/workers/enforcementWorker');
const dbManager = require('../../backend/services/databaseManager');
const caseLifecycle = require('../../backend/services/caseLifecycle');

jest.mock('../../backend/services/databaseManager', () => {
    const actual = jest.requireActual('../../backend/services/databaseManager');
    return {
        ...actual,
        getWriteClient: jest.fn(),
        getReadClient: jest.fn(),
        initialize: jest.fn().mockResolvedValue(true)
    };
});

describe('CVE Chaos & Resilience Substrate', () => {
    let mockPrisma;

    beforeEach(() => {
        mockPrisma = {
            case: { findMany: jest.fn(), update: jest.fn() },
            $transaction: jest.fn(cb => cb(mockPrisma))
        };
        dbManager.getWriteClient.mockReturnValue(mockPrisma);
        dbManager.getReadClient.mockReturnValue(mockPrisma);
    });

    test('Worker Crash Recovery: should resume monitoring from last consistent state', async () => {
        // Simulation: Worker was killed mid-process. New worker starts.
        // It must find cases where status is Notice_Sent but deadline is passed.
        const caseId = 'CHAOS-RESUME-001';
        const pastDeadline = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30); // 30 days ago

        mockPrisma.case.findMany.mockResolvedValue([
            { id: caseId, status: 'Notice_Sent', noticeDeadline: pastDeadline, noticeStatus: 'SENT' }
        ]);

        // "Restarted" worker runs
        await enforcementWorker.monitorDeadlines();

        // Must still process the outstanding case
        expect(mockPrisma.case.update).toHaveBeenCalled();
    });

    test('DB Latency Resilience: should handle delayed queries gracefully', async () => {
        // Simulation: Database is slow (100ms lag)
        mockPrisma.case.findMany.mockImplementation(async () => {
            await new Promise(r => setTimeout(r, 100)); 
            return [];
        });

        const start = Date.now();
        await enforcementWorker.monitorDeadlines();
        const end = Date.now();

        expect(end - start).toBeGreaterThanOrEqual(100);
        // System should not crash or lose state; simply wait for the resource
    });

});
