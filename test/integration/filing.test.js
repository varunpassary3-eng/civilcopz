const filingService = require('../../backend/services/filingService');
const dbManager = require('../../backend/services/databaseManager');
const fs = require('fs');
const path = require('path');

// Mock Prisma Client
jest.mock('../../backend/services/databaseManager', () => ({
  getReadClient: jest.fn()
}));

describe('AFE Filing Substrate (PDF Generation)', () => {
    let mockPrisma;

    beforeEach(() => {
        mockPrisma = {
            case: {
                findUnique: jest.fn()
            }
        };
        dbManager.getReadClient.mockReturnValue(mockPrisma);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should generate a complaint PDF for a valid case', async () => {
        const caseId = 'CASE-AFE-101';
        const mockCaseData = {
            id: caseId,
            consumerName: 'Test Consumer',
            consumerAddress: '123 Test St, Delhi',
            consumerEmail: 'test@example.com',
            consumerPhone: '9876543210',
            company: 'Test Company',
            description: 'Test case description for legal filing.',
            jurisdiction: 'Delhi',
            considerationPaid: 10000,
            expectedCompensationClient: 20000,
            proposedCompensationAdvocate: 25000,
            finalCourtClaimValue: 35000,
            noticeSentAt: new Date(),
            filingMode: 'BOTH',
            documents: [
                { type: 'Invoice', fileHash: 'HASH1234567890123456', fileUrl: '/uploads/invoice.pdf' }
            ],
            events: [
                { timestamp: new Date(), eventType: 'NOTICE_SENT', actor: 'SYSTEM' }
            ]
        };

        mockPrisma.case.findUnique.mockResolvedValue(mockCaseData);

        const pdfUrl = await filingService.generateCourtComplaint(caseId);
        
        expect(pdfUrl).toContain(`Court_Complaint_${caseId}.pdf`);
        
        // Verify file exists on disk
        const filePath = path.join(__dirname, '../../backend', pdfUrl);
        expect(fs.existsSync(filePath)).toBe(true);
        
        // Cleanup
        // fs.unlinkSync(filePath);
    });

    test('should bundle a full litigation package', async () => {
        const caseId = 'CASE-PKG-202';
        const mockCaseData = {
            id: caseId,
            consumerName: 'Ravi Kumar',
            consumerAddress: 'Delhi',
            finalCourtClaimValue: 50000,
            documents: []
        };
        mockPrisma.case.findUnique.mockResolvedValue(mockCaseData);

        const pkg = await filingService.getLitigationPackage(caseId);
        
        expect(pkg).toHaveProperty('complaintUrl');
        expect(pkg).toHaveProperty('affidavitUrl');
        expect(pkg.vakalatnamaUrl).toBeDefined();
        expect(pkg.statutoryFee).toBeDefined();
    });

    test('Forensic Content: Generated Complaint must contain key legal clauses', async () => {
        const caseId = 'CASE-AFE-TEXT-99';
        const pdfParse = require('pdf-parse');
        
        const mockCaseData = {
            id: caseId,
            consumerName: 'Legal Checker',
            consumerAddress: 'Test Address',
            finalCourtClaimValue: 50000,
            jurisdiction: 'New Delhi',
            documents: [],
            events: []
        };
        mockPrisma.case.findUnique.mockResolvedValue(mockCaseData);

        const pdfUrl = await filingService.generateCourtComplaint(caseId);
        const filePath = path.join(__dirname, '../../backend', pdfUrl);
        const dataBuffer = fs.readFileSync(filePath);

        const data = await pdfParse(dataBuffer);
        const pdfText = data.text;

        // Content Assertions for forensic completeness
        expect(pdfText).toContain('BEFORE THE HONORABLE');
        expect(pdfText).toContain('JURISDICTION');
        expect(pdfText).toContain('COMPLAINT UNDER SECTION 35');
        expect(pdfText).toContain('PRAYER');
        expect(pdfText).toContain('VERIFICATION');
    });

});
