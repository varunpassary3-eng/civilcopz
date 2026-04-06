const eventLedger = require('../../backend/services/eventLedgerService');
const dbManager = require('../../backend/services/databaseManager');
const crypto = require('crypto');

// Mock Prisma Client
jest.mock('../../backend/services/databaseManager', () => ({
  getWriteClient: jest.fn()
}));

describe('Case Event Ledger Substrate', () => {
    let mockPrisma;

    beforeEach(() => {
        mockPrisma = {
            caseEvent: {
                findFirst: jest.fn(),
                create: jest.fn(),
                findMany: jest.fn()
            },
            $transaction: jest.fn(callback => callback(mockPrisma))
        };
        dbManager.getWriteClient.mockReturnValue(mockPrisma);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should record an event with correct hash linking', async () => {
        const caseId = 'CASE-123';
        const eventType = 'NOTICE_SENT';
        const payload = { recipient: 'Reliance' };
        const actor = 'SYSTEM';

        // 1. Mock the "last event" so we have a pointer
        const lastEvent = {
            hash: 'PREVIOUS_HASH_001'
        };
        mockPrisma.caseEvent.findFirst.mockResolvedValue(lastEvent);
        mockPrisma.caseEvent.create.mockImplementation(({ data }) => Promise.resolve({ ...data, id: 1 }));

        const event = await eventLedger.recordEvent(caseId, eventType, payload, actor);

        // 2. Verify the hashing logic matches the implementation
        // hashContent = `${prevHash}|${JSON.stringify(payload)}|${eventType}|${actor}|${timestamp}`;
        expect(event.prevHash).toBe('PREVIOUS_HASH_001');
        expect(event.hash).toBeDefined();
        
        // Manual verification of the hash construction
        const timestampStr = event.timestamp.toISOString();
        const expectedContent = `PREVIOUS_HASH_001|${JSON.stringify(payload)}|${eventType}|${actor}|${timestampStr}`;
        const expectedHash = crypto.createHash('sha256').update(expectedContent).digest('hex');
        
        expect(event.hash).toBe(expectedHash);
    });

    test('should verify integrity of a valid chain', async () => {
        const caseId = 'CASE-123';
        
        // Define a manual chain
        const e1_prev = 'GENESIS_LITIGATION_EVENT';
        const e1_payload = { step: 1 };
        const e1_type = 'CREATED';
        const e1_ts = new Date('2026-04-01T00:00:00Z');
        const e1_hash = crypto.createHash('sha256').update(`${e1_prev}|${JSON.stringify(e1_payload)}|${e1_type}|USER|${e1_ts.toISOString()}`).digest('hex');

        const e2_prev = e1_hash;
        const e2_payload = { step: 2 };
        const e2_type = 'SENT';
        const e2_ts = new Date('2026-04-02T00:00:00Z');
        const e2_hash = crypto.createHash('sha256').update(`${e2_prev}|${JSON.stringify(e2_payload)}|${e2_type}|SYSTEM|${e2_ts.toISOString()}`).digest('hex');

        mockPrisma.caseEvent.findMany.mockResolvedValue([
            { id: 1, caseId, eventType: e1_type, payload: e1_payload, actor: 'USER', timestamp: e1_ts, prevHash: e1_prev, hash: e1_hash },
            { id: 2, caseId, eventType: e2_type, payload: e2_payload, actor: 'SYSTEM', timestamp: e2_ts, prevHash: e2_prev, hash: e2_hash }
        ]);

        const isValid = await eventLedger.verifyChain(caseId);
        expect(isValid).toBe(true);
    });

    test('should detect a broken chain (mismatched prevHash)', async () => {
        const caseId = 'CASE-ERROR';
        mockPrisma.caseEvent.findMany.mockResolvedValue([
            { id: 1, caseId, eventType: 'CREATED', payload: {}, actor: 'USER', timestamp: new Date(), prevHash: 'GENESIS', hash: 'H1' },
            { id: 2, caseId, eventType: 'SENT', payload: {}, actor: 'SYSTEM', timestamp: new Date(), prevHash: 'TAMPERED_PREV', hash: 'H2' }
        ]);

        const isValid = await eventLedger.verifyChain(caseId);
        expect(isValid).toBe(false);
    });

    test('should detect forensic hash mismatch (Unauthorized Content Modification)', async () => {
        const caseId = 'CASE-TAMPER';
        const e1_prev = 'GENESIS_LITIGATION_EVENT';
        const e1_payload = { step: 1 };
        const e1_type = 'CREATED';
        const e1_ts = new Date();
        const e1_hash = crypto.createHash('sha256').update(`${e1_prev}|${JSON.stringify(e1_payload)}|${e1_type}|USER|${e1_ts.toISOString()}`).digest('hex');

        // SIMULATED ATTACK: Modify payload but keep the same hash (Direct DB Write Attack)
        const tamperedPayload = { step: 1, modified: true }; // Unauthorized modification

        mockPrisma.caseEvent.findMany.mockResolvedValue([
            { id: 1, caseId, eventType: e1_type, payload: tamperedPayload, actor: 'USER', timestamp: e1_ts, prevHash: e1_prev, hash: e1_hash }
        ]);

        const isValid = await eventLedger.verifyChain(caseId);
        
        // Assertion validates: Unauthorized modification detected due to SHA-256 mismatch
        expect(isValid).toBe(false);
    });

    describe('Forensic Anchor Layer', () => {
        test('should generate a daily root hash for external anchoring', async () => {
            const ledgerService = require('../../backend/services/ledgerService');
            mockPrisma.caseEvent.findMany.mockResolvedValue([
                { hash: 'H1', timestamp: new Date() },
                { hash: 'H2', timestamp: new Date() }
            ]);
            mockPrisma.dailyLedgerHash.upsert.mockResolvedValue({ rootHash: 'ROOT_MOCK_123', eventCount: 2 });

            const record = await ledgerService.generateDailyRootHash();
            expect(record.rootHash).toBeDefined();
            expect(record.eventCount).toBe(2);
        });

        test('should match external anchored hash (Independent Verification)', async () => {
            const ledgerService = require('../../backend/services/ledgerService');
            mockPrisma.dailyLedgerHash.findUnique.mockResolvedValue({ rootHash: 'MATCH_HASH' });

            const audit = await ledgerService.verifyAgainstExternal(new Date());
            expect(audit.isValid).toBe(true);
            expect(audit.localHash).toBe('MATCH_HASH');
        });
    });

});
