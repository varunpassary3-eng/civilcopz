const reputationService = require('../../backend/services/reputationService');
const dbManager = require('../../backend/services/databaseManager');

jest.mock('../../backend/services/databaseManager', () => ({
    getReadClient: jest.fn()
}));

describe('Reputation Engine Substrate (Risk Scoring)', () => {
    let mockPrisma;

    beforeEach(() => {
        mockPrisma = {
            case: { findMany: jest.fn() },
            company: { findMany: jest.fn() }
        };
        dbManager.getReadClient.mockReturnValue(mockPrisma);
    });

    test('should calculate Critical risk for high-volume of unresolved cases', async () => {
        const companyName = 'Escalation Corp';
        
        // Mock data: 20 total cases, all unresolved, all high severity
        const mockCases = Array(20).fill({
            status: 'Submitted',
            aiSeverity: 'High',
            satisfaction: 'Unsatisfied'
        });

        mockPrisma.case.findMany.mockResolvedValue(mockCases);

        const result = await reputationService.calculateCompanyScore(companyName);
        
        // Score = (20 * 2) + (20 * 3) + (20 * 5) + (20 * 10) = 40 + 60 + 100 + 200 = 400
        expect(result.score).toBe(400);
        expect(result.risk).toBe('Critical');
    });

    test('should calculate Low risk for resolved cases with good satisfaction', async () => {
        const companyName = 'Good Corp';
        const mockCases = [
            { status: 'Resolved', aiSeverity: 'Low', satisfaction: 'Satisfied' }
        ];

        mockPrisma.case.findMany.mockResolvedValue(mockCases);

        const result = await reputationService.calculateCompanyScore(companyName);
        
        // Score = (1 * 2) + (0 * 3) + (0 * 5) + (0 * 10) = 2
        expect(result.score).toBe(2);
        expect(result.risk).toBe('Low');
    });

});
