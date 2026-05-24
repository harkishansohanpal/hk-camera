/**
 * Integration tests for Auth API
 *
 * Prerequisites:
 *   docker compose up -d postgres redis
 *   DATABASE_URL=postgresql://hk:secret@localhost:5432/hkdb_test
 *   npx prisma migrate deploy
 *
 * These tests are skipped by default. Run with:
 *   INTEGRATION=1 npx jest --runInBand __tests__/auth.integration.test.js
 */

const request = require('supertest');
const { app, server } = require('../index');

const itif = (process.env.INTEGRATION ? it : it.skip);

describe('Auth API (integration)', () => {
  afterAll(() => { server.close(); });

  itif('POST /api/auth/register creates a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'integ-test@example.com', password: 'StrongP@ss1', name: 'Integration Tester' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
  });

  itif('POST /api/auth/login returns tokens', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'integ-test@example.com', password: 'StrongP@ss1' });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
  });

  itif('POST /api/auth/login with wrong password returns 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'integ-test@example.com', password: 'WrongPassword!' });
    expect(res.status).toBe(401);
  });
});
