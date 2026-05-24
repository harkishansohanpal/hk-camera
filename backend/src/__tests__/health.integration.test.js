const request = require('supertest');
const { app, server } = require('../index');

describe('Health API (integration)', () => {
  afterAll(() => { server.close(); });

  it('GET /api/health returns 200 with uptime', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('timestamp');
  });
});
