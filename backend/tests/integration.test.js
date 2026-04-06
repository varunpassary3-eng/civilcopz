const request = require('supertest');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const dbManager = require('../services/databaseManager');
const cacheService = require('../services/cacheService');
const { app } = require('../server');

describe('Integration test environment', () => {
  beforeAll(async () => {
    console.log('🔍 Test environment variables:');
    console.log('REDIS_HOST:', process.env.REDIS_HOST);
    console.log('REDIS_PORT:', process.env.REDIS_PORT);
    console.log('DATABASE_URL:', process.env.DATABASE_URL);

    process.env.NODE_ENV = 'test';
    await dbManager.initialize();
    if (!cacheService.isRedisConnected) {
      await cacheService.initializeRedis();
    }
  });

  afterAll(async () => {
    await cacheService.disconnect();
    await dbManager.disconnect();
  });

  test('health check', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.services).toMatchObject({ database: 'connected', redis: 'connected' });
  });

  test('rejects unauthorized', async () => {
    const res = await request(app)
      .post('/api/certificates/generate')
      .send({ caseId: 'test-case', evidenceId: 'test-evidence', evidenceType: 'DOCUMENT' });

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/Authorization token required|Invalid or expired token/i);
  });

  test('blocks non-admin', async () => {
    const token = jwt.sign({ id: 'user1', email: 'user@test.local', role: 'consumer' }, process.env.JWT_SECRET || 'test_secret');
    const res = await request(app)
      .post('/api/certificates/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ caseId: 'test-case', evidenceId: 'test-evidence', evidenceType: 'DOCUMENT' });

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/Insufficient permissions|Admin access required/i);
  });

  test('allows admin access', async () => {
    const token = jwt.sign({ id: 'admin1', email: 'admin@test.local', role: 'admin' }, process.env.JWT_SECRET || 'test_secret');
    const res = await request(app)
      .post('/api/certificates/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ caseId: 'test-case', evidenceId: 'test-evidence', evidenceType: 'DOCUMENT' });

    // Should fail due to missing case, but not due to auth
    expect(res.statusCode).not.toBe(401);
    expect(res.statusCode).not.toBe(403);
  });

  test('rejects invalid JWT', async () => {
    const res = await request(app)
      .get('/api/certificates')
      .set('Authorization', 'Bearer invalid.jwt.token');

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/Invalid or expired token/i);
  });

  test('rejects expired JWT', async () => {
    const expiredToken = jwt.sign(
      { id: 'user1', email: 'user@test.local', role: 'consumer' },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '-1h' }
    );

    const res = await request(app)
      .get('/api/certificates')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/Invalid or expired token/i);
  });

  test('evidence integrity survives upload and verification', async () => {
    const prisma = dbManager.getWriteClient();
    const email = `integrity.${Date.now()}@test.local`;
    const passwordHash = await bcrypt.hash('EvidenceTest@123', 4);
    const user = await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        role: 'consumer',
      },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'test_secret'
    );

    const fixturePath = path.join(__dirname, 'fixtures', 'evidence-sample.pdf');
    const fixtureBuffer = await fs.readFile(fixturePath);
    const localHash = crypto.createHash('sha256').update(fixtureBuffer).digest('hex');

    const createCase = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${token}`)
      .field('consumerName', 'Integrity Tester')
      .field('consumerEmail', email)
      .field('consumerPhone', '9999999999')
      .field('consumerAddress', 'Test Address, District')
      .field('title', `Evidence Integrity ${Date.now()}`)
      .field('description', 'Validate evidence hash consistency across upload and verification.')
      .field('company', `Integrity Co ${Date.now()}`)
      .field('category', 'E-Commerce')
      .field('jurisdiction', 'District')
      .field('considerationPaid', '1000')
      .field('expectedCompensationClient', '500')
      .field('isDeclaredTrue', 'true')
      .field('declaredName', 'Integrity Tester')
      .attach('documents', fixturePath);

    expect(createCase.statusCode).toBe(201);
    const createdCase = createCase.body.case;
    const createdDocument = createdCase.documents[0];
    expect(createdDocument.fileHash).toBe(localHash);

    const custody = await request(app)
      .post('/api/litigation/custody/upload')
      .set('Authorization', `Bearer ${token}`)
      .send({
        caseId: createdCase.id,
        evidenceId: createdDocument.id,
        reason: 'Integration test custody upload',
        transferMethod: 'ELECTRONIC',
        deviceFingerprint: 'integration-suite',
      });

    expect(custody.statusCode).toBe(200);
    expect(custody.body.evidenceId).toBe(createdDocument.id);

    const manifest = await request(app)
      .post(`/api/litigation/verification/manifest/${createdCase.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(manifest.statusCode).toBe(200);
    const manifestDocument = manifest.body.manifest.verificationData.evidence.find(
      (entry) => entry.id === createdDocument.id
    );

    expect(manifestDocument).toBeTruthy();
    expect(manifestDocument.fileHash).toBe(localHash);
  });
});
