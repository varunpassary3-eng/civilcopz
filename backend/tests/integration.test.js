const request = require('supertest');
const jwt = require('jsonwebtoken');
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
});
