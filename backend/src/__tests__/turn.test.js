const request = require('supertest');
const { app, server } = require('../index');
const jwt = require('jsonwebtoken');

const userId = 'user-turn-test';

function authToken() {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
}

const mockAuthUser = {
  id: userId,
  email: 'turnuser@example.com',
  name: 'Turn User',
  role: 'USER',
};

beforeEach(() => {
  jest.clearAllMocks();
  // Authenticate middleware needs user lookup to succeed
  global.mockPrisma.user.findUnique.mockImplementation(({ where: { id } }) => {
    if (id === userId) return Promise.resolve(mockAuthUser);
    return Promise.resolve(null);
  });
  // Default: no TURN config (STUN-only fallback)
  delete process.env.COTURN_REALM;
  delete process.env.COTURN_SECRET;
  delete process.env.CLOUDFLARE_TURN_TOKEN_ID;
  delete process.env.CLOUDFLARE_TURN_API_TOKEN;
});

afterAll(() => {
  server.close();
});

describe('GET /api/turn-credentials', () => {
  it('returns STUN-only when no TURN config set', async () => {
    const res = await request(app)
      .get('/api/turn-credentials')
      .set('Authorization', `Bearer ${authToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.iceServers).toHaveLength(1);
    expect(res.body.data.iceServers[0].urls).toBe('stun:stun.cloudflare.com:3478');
  });

  it('returns Coturn credentials when COTURN_REALM and COTURN_SECRET are set', async () => {
    process.env.COTURN_REALM = 'example.com';
    process.env.COTURN_SECRET = 'coturn-secret-123';
    process.env.COTURN_SERVER = 'turn.example.com';
    process.env.COTURN_PORT = '3478';

    const res = await request(app)
      .get('/api/turn-credentials')
      .set('Authorization', `Bearer ${authToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.iceServers).toHaveLength(2);
    expect(res.body.data.iceServers[0].urls).toBe('stun:turn.example.com:3478');
    expect(res.body.data.iceServers[1].urls).toEqual([
      'turn:turn.example.com:3478?transport=udp',
      'turn:turn.example.com:3478?transport=tcp',
    ]);
    expect(res.body.data.iceServers[1].username).toBeDefined();
    expect(res.body.data.iceServers[1].credential).toBeDefined();
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/turn-credentials');
    expect(res.status).toBe(401);
  });
});
