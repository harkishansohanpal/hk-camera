const request = require('supertest');
const { app, server } = require('../index');

afterAll(() => {
  server.close();
});

describe('GET /api/health', () => {
  it('returns 200 with uptime and timestamp', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.uptime).toBe('number');
    expect(typeof res.body.timestamp).toBe('string');
  });
});
