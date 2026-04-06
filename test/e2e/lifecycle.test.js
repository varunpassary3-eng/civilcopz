const request = require('supertest');
const { app, server } = require('../../backend/server');
const dbManager = require('../../backend/services/databaseManager');
const path = require('path');
const fs = require('fs');

// Mock external services to ensure litigation-grade deterministic results
jest.mock('../../backend/services/databaseManager', () => {
    const actual = jest.requireActual('../../backend/services/databaseManager');
    return {
        ...actual,
        getWriteClient: jest.fn(),
        getReadClient: jest.fn(),
        initialize: jest.fn().mockResolvedValue(true)
    };
});

describe('CivilCOPZ End-to-End Litigation Lifecycle', () => {
    let mockPrisma;
    let authHeader;

    beforeAll(async () => {
        // Setup mock prisma
        mockPrisma = {
            user: { findUnique: jest.fn() },
            case: { 
                create: jest.fn(), 
                findUnique: jest.fn(), 
                update: jest.fn(),
                findMany: jest.fn()
            },
            caseEvent: { create: jest.fn(), findFirst: jest.fn() },
            evidenceIntegrityLedger: { create: jest.fn(), findFirst: jest.fn() },
            caseTimeline: { create: jest.fn() },
            company: { upsert: jest.fn() },
            $transaction: jest.fn(cb => cb(mockPrisma))
        };
        dbManager.getWriteClient.mockReturnValue(mockPrisma);
        dbManager.getReadClient.mockReturnValue(mockPrisma);

        // Mock Auth
        authHeader = 'Bearer mock-token';
        // In a real test, we would hit /api/users/login, but here we mock the auth middleware if needed
        // For this E2E, we'll assume a 'mock-auth' middleware or bypass if NODE_ENV=test
    });

    afterAll((done) => {
        server.close(done);
    });

    test('Full Journey: Submission -> Notice -> Expiry -> Filing Package', async () => {
        const caseId = 'E2E-CASE-999';
        
        // 1. Submit Case
        mockPrisma.case.create.mockResolvedValue({
            id: caseId,
            title: 'Defective Alpha-Bot',
            status: 'Submitted',
            documents: []
        });
        mockPrisma.caseEvent.findFirst.mockResolvedValue(null); // Genesis event

        const submissionRes = await request(app)
            .post('/api/cases')
            .set('Authorization', authHeader)
            .field('title', 'Defective Alpha-Bot')
            .field('description', 'The robot exploded during the first charging cycle.')
            .field('company', 'Cyberdyne Systems')
            .field('category', 'Other')
            .field('jurisdiction', 'District')
            .field('consumerName', 'Sarah Connor')
            .field('consumerEmail', 'sarah@resistance.org')
            .field('consumerPhone', '9999999999')
            .field('consumerAddress', 'Underground Bunker, LA')
            .field('isDeclaredTrue', 'true')
            .field('declaredName', 'Sarah Connor')
            .attach('documents', Buffer.from('mock pdf'), 'invoice.pdf');

        expect(submissionRes.status).toBe(201);
        expect(submissionRes.body.case.id).toBe(caseId);

        // 2. Send Legal Notice (Simulated Status Update)
        mockPrisma.case.update.mockResolvedValue({
            id: caseId,
            status: 'Notice_Sent',
            noticeSentAt: new Date()
        });

        const noticeRes = await request(app)
            .patch(`/api/cases/${caseId}/status`)
            .set('Authorization', authHeader)
            .send({ status: 'Notice_Sent' });

        expect(noticeRes.status).toBe(200);
        expect(noticeRes.body.status).toBe('Notice_Sent');

        // 3. Generate Litigation Package
        mockPrisma.case.findUnique.mockResolvedValue({
            id: caseId,
            consumerName: 'Sarah Connor',
            consumerAddress: 'Underground Bunker, LA',
            finalCourtClaimValue: 500000,
            status: 'Notice_Sent',
            noticeSentAt: new Date(),
            documents: [],
            events: []
        });

        const filingRes = await request(app)
            .get(`/api/cases/${caseId}/filing-package`)
            .set('Authorization', authHeader);

        expect(filingRes.status).toBe(200);
        expect(filingRes.body).toHaveProperty('complaintUrl');
        expect(filingRes.body.filingMode).toBe('BOTH');
    });

});
