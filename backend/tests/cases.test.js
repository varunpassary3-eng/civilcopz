const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const app = require('../server');

const prisma = new PrismaClient();

describe('Cases API', () => {
  beforeAll(async () => {
    // Clean up test data
    await prisma.case.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create a case', async () => {
    const response = await request(app)
      .post('/api/cases')
      .send({
        title: 'Test Case',
        description: 'Test description',
        company: 'Test Company',
        category: 'Telecom',
        jurisdiction: 'District',
      });

    expect(response.status).toBe(201);
    expect(response.body.title).toBe('Test Case');
  });

  it('should get cases', async () => {
    const response = await request(app).get('/api/cases');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.cases)).toBe(true);
  });

  it('should get case by id', async () => {
    // First create a case
    const createResponse = await request(app)
      .post('/api/cases')
      .send({
        title: 'Test Case 2',
        description: 'Test description 2',
        company: 'Test Company 2',
        category: 'Banking',
        jurisdiction: 'State',
      });

    const caseId = createResponse.body.id;

    const response = await request(app).get(`/api/cases/${caseId}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(caseId);
  });
});
