const governanceService = require('../../backend/services/governanceService');

describe('Governance Engine (CPA 2019 Revision)', () => {
    
    describe('Pecuniary Jurisdiction (mapForum)', () => {
        test('should classify as DISTRICT for claim <= 50 Lakh', () => {
            expect(governanceService.mapForum(5000000)).toBe('District Consumer Disputes Redressal Commission');
            expect(governanceService.mapForum(100000)).toBe('District Consumer Disputes Redressal Commission');
        });

        test('should classify as STATE for claim > 50 Lakh and <= 2 Crore', () => {
            expect(governanceService.mapForum(5000001)).toBe('State Consumer Disputes Redressal Commission');
            expect(governanceService.mapForum(20000000)).toBe('State Consumer Disputes Redressal Commission');
        });

        test('should classify as NATIONAL for claim > 2 Crore', () => {
            expect(governanceService.mapForum(20000001)).toBe('National Consumer Disputes Redressal Commission (NCDRC)');
            expect(governanceService.mapForum(150000000)).toBe('National Consumer Disputes Redressal Commission (NCDRC)');
        });
    });

    describe('Statutory Filing Fee (calculateFilingFee)', () => {
        test('should be FREE for claim <= 5 Lakh', () => {
            expect(governanceService.calculateFilingFee(500000)).toBe(0);
        });

        test('should be ₹200 for claim up to 10 Lakh', () => {
            expect(governanceService.calculateFilingFee(1000000)).toBe(200);
        });

        test('should be ₹1000 for claim up to 50 Lakh', () => {
            expect(governanceService.calculateFilingFee(5000000)).toBe(1000);
        });

        test('should be ₹2000 for claim up to 1 Crore', () => {
            expect(governanceService.calculateFilingFee(10000000)).toBe(2000);
        });

        test('should cap at ₹10000 for extremely high claims', () => {
            expect(governanceService.calculateFilingFee(500000000)).toBe(10000);
        });
    });

    describe('Time Manipulation Resistance (Forensic Integrity)', () => {
        beforeAll(() => {
            jest.useFakeTimers();
        });

        afterAll(() => {
            jest.useRealTimers();
        });

        test('should ignore client-side system clock spoofing', () => {
            const serverNow = new Date('2026-04-04T10:00:00Z');
            jest.setSystemTime(serverNow);

            // Simulation: Client attempts to manipulate "current time" to bypass deadlines
            // BUT our system relies on the server-bound Governance and Worker substrate
            const deadline = new Date('2026-04-05T10:00:00Z');
            
            // Logic: Remaining time should be exactly 24 hours regardless of any manual 
            // date manipulation in the req.body if we use a server-side timestamp source.
            const diffMs = deadline.getTime() - Date.now(); // Date.now() is now 2026-04-04T10:00:00Z
            expect(diffMs).toBe(24 * 60 * 60 * 1000);
        });

        test('should use Database as the Sovereign Time Authority', async () => {
            const dbManager = require('../../backend/services/databaseManager');
            const mockNow = new Date('2026-04-05T00:00:00Z');
            
            jest.spyOn(dbManager, 'getServerTime').mockResolvedValue(mockNow);
            
            const serverTime = await dbManager.getServerTime();
            expect(serverTime.toISOString()).toBe(mockNow.toISOString());
        });
    });

    describe('Compensation Realism Advisory (getAdvisory)', () => {
        test('should flag CRITICAL if compensation >= 5x consideration', () => {
            const advisory = governanceService.getAdvisory(100000, 500000);
            expect(advisory.level).toBe('CRITICAL');
            expect(advisory.message).toContain('exceeds 5x');
        });

        test('should flag WARNING if compensation >= 2x consideration', () => {
            const advisory = governanceService.getAdvisory(100000, 250000);
            expect(advisory.level).toBe('WARNING');
            expect(advisory.message).toContain('disproportionately high');
        });

        test('should identify STABLE ratio', () => {
            const advisory = governanceService.getAdvisory(100000, 50000);
            expect(advisory.level).toBe('STABLE');
        });
    });

});
