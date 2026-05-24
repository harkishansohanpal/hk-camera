const request = require('supertest');
const { app, server } = require('../index');
const jwt = require('jsonwebtoken');

const mockUser = {
  id: 'regression-user-id',
  email: 'regression@test.com',
  name: 'Regression User',
  role: 'USER',
  passwordHash: 'hashed_password123',
  createdAt: new Date().toISOString(),
};

const mockAdmin = {
  id: 'admin-id',
  email: 'admin@test.com',
  name: 'Admin User',
  role: 'ADMIN',
  passwordHash: 'hashed_adminpass',
  createdAt: new Date().toISOString(),
};

const mockCamera = {
  id: 'cam-regression-1',
  name: 'Regression Camera',
  userId: mockUser.id,
  streamKey: 'stream-key-regression',
  motionDetect: true,
  sensitivity: 50,
  detectionMode: 'PIXEL_DIFF',
};

const mockPlan = {
  id: 'plan-pro',
  name: 'Pro',
  stripePriceId: 'price_pro_monthly',
  price: 999,
  features: JSON.stringify(['30-day recordings']),
  sortOrder: 1,
};

function userToken(user = mockUser) {
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
}

beforeEach(() => {
  jest.clearAllMocks();
  global.mockPrisma.user.findUnique.mockImplementation(({ where: { id } }) => {
    if (id === mockUser.id) return Promise.resolve(mockUser);
    if (id === mockAdmin.id) return Promise.resolve(mockAdmin);
    return Promise.resolve(null);
  });
  delete process.env.COTURN_REALM;
  delete process.env.COTURN_SECRET;
  delete process.env.COTURN_SERVER;
  delete process.env.COTURN_PORT;
  delete process.env.CLOUDFLARE_TURN_TOKEN_ID;
  delete process.env.CLOUDFLARE_TURN_API_TOKEN;
});

afterAll(() => {
  server.close();
});

describe('Regression – Health & System', () => {
  it('GET /api/health returns system status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.uptime).toBe('number');
    expect(typeof res.body.timestamp).toBe('string');
  });

  it('GET /nonexistent returns 404', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.status).toBe(404);
  });
});

describe('Regression – Authentication', () => {
  it('register creates user and returns tokens', async () => {
    global.mockPrisma.user.findUnique.mockResolvedValue(null);
    global.mockPrisma.user.create.mockResolvedValue(mockUser);
    global.mockPrisma.refreshToken.create.mockResolvedValue({ token: 'rt', userId: mockUser.id });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: mockUser.email, password: 'StrongPass1!', name: mockUser.name, consent: true, turnstileToken: 'test-token' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(mockUser.email);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  it('register rejects duplicate email', async () => {
    global.mockPrisma.user.findUnique.mockResolvedValue(mockUser);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: mockUser.email, password: 'StrongPass1!', name: mockUser.name, consent: true, turnstileToken: 'test-token' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('register rejects missing fields', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.status).toBe(422);
  });

  it('login with valid credentials returns tokens', async () => {
    global.mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    global.mockPrisma.refreshToken.create.mockResolvedValue({ token: 'rt', userId: mockUser.id });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: mockUser.email, password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  it('login with wrong password returns 401', async () => {
    global.mockPrisma.user.findUnique.mockResolvedValue(mockUser);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: mockUser.email, password: 'wrongpass' });

    expect(res.status).toBe(401);
  });

  it('login for nonexistent user returns 401', async () => {
    global.mockPrisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@test.com', password: 'password123' });

    expect(res.status).toBe(401);
  });

  it('refresh token rotation works', async () => {
    const validToken = jwt.sign({ sub: mockUser.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    global.mockPrisma.refreshToken.findUnique.mockResolvedValue({
      token: validToken,
      userId: mockUser.id,
      expiresAt: new Date(Date.now() + 86400000),
    });
    global.mockPrisma.refreshToken.delete.mockResolvedValue({});
    global.mockPrisma.refreshToken.create.mockResolvedValue({});

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: validToken });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('refresh with invalid token returns 401', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'bogus-refresh-token' });

    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me returns authenticated user', async () => {
    global.mockPrisma.user.findUnique.mockResolvedValue(mockUser);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${userToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(mockUser.email);
  });

  it('GET /api/auth/me returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me returns 401 with expired token', async () => {
    const expired = jwt.sign({ sub: mockUser.id }, process.env.JWT_SECRET, { expiresIn: '0s' });
    await new Promise(r => setTimeout(r, 100));

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expired}`);

    expect(res.status).toBe(401);
  });

  it('logout clears refresh tokens', async () => {
    global.mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

    const res = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken: 'some-token' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('unauthenticated endpoints return 401', async () => {
    const protectedRoutes = [
      { method: 'get', url: '/api/cameras' },
      { method: 'post', url: '/api/cameras' },
      { method: 'get', url: '/api/auth/me' },
      { method: 'get', url: '/api/recordings' },
      { method: 'get', url: '/api/users/me' },
    ];

    for (const route of protectedRoutes) {
      const res = await request(app)[route.method](route.url);
      expect(res.status).toBe(401);
    }
  });
});

describe('Regression – Camera CRUD', () => {
  it('creates a new camera', async () => {
    global.mockPrisma.camera.create.mockResolvedValue(mockCamera);

    const res = await request(app)
      .post('/api/cameras')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({ name: 'Regression Camera', motionDetect: true, sensitivity: 50, detectionMode: 'PIXEL_DIFF' });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Regression Camera');
  });

  it('lists user cameras', async () => {
    global.mockPrisma.camera.findMany.mockResolvedValue([mockCamera]);
    global.mockPrisma.camera.count.mockResolvedValue(1);

    const res = await request(app)
      .get('/api/cameras')
      .set('Authorization', `Bearer ${userToken()}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('gets a single camera', async () => {
    global.mockPrisma.camera.findUnique.mockResolvedValue(mockCamera);

    const res = await request(app)
      .get(`/api/cameras/${mockCamera.id}`)
      .set('Authorization', `Bearer ${userToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(mockCamera.id);
  });

  it('updates a camera', async () => {
    const updated = { ...mockCamera, name: 'Updated Camera' };
    global.mockPrisma.camera.findUnique
      .mockResolvedValueOnce(mockCamera)  // get
      .mockResolvedValueOnce(mockCamera); // ownership check
    global.mockPrisma.camera.update.mockResolvedValue(updated);

    const res = await request(app)
      .patch(`/api/cameras/${mockCamera.id}`)
      .set('Authorization', `Bearer ${userToken()}`)
      .send({ name: 'Updated Camera' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated Camera');
  });

  it('deletes a camera', async () => {
    global.mockPrisma.camera.findUnique.mockResolvedValue(mockCamera);
    global.mockPrisma.camera.delete.mockResolvedValue(mockCamera);

    const res = await request(app)
      .delete(`/api/cameras/${mockCamera.id}`)
      .set('Authorization', `Bearer ${userToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 404 for nonexistent camera', async () => {
    global.mockPrisma.camera.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/cameras/nonexistent-cam')
      .set('Authorization', `Bearer ${userToken()}`);

    expect(res.status).toBe(404);
  });

  it('returns camera stream key', async () => {
    global.mockPrisma.camera.findUnique.mockResolvedValue(mockCamera);

    const res = await request(app)
      .get(`/api/cameras/${mockCamera.id}/stream-key`)
      .set('Authorization', `Bearer ${userToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.streamKey).toBe(mockCamera.streamKey);
  });

  it('heartbeat updates camera status', async () => {
    global.mockPrisma.camera.findUnique.mockResolvedValue(mockCamera);
    global.mockPrisma.camera.update.mockResolvedValue({ ...mockCamera, isOnline: true });

    const res = await request(app)
      .post(`/api/cameras/${mockCamera.id}/heartbeat`)
      .set('Authorization', `Bearer ${userToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('creates camera with name, validates required field', async () => {
    const res = await request(app)
      .post('/api/cameras')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({});

    expect(res.status).toBe(422);
  });
});

describe('Regression – TURN Credentials', () => {
  it('returns STUN-only credentials by default', async () => {
    const res = await request(app)
      .get('/api/turn-credentials')
      .set('Authorization', `Bearer ${userToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.iceServers).toBeDefined();
    const stun = res.body.data.iceServers.find(s => s.urls.includes('stun:'));
    expect(stun).toBeDefined();
  });

  it('returns 401 without auth for turn credentials', async () => {
    const res = await request(app).get('/api/turn-credentials');
    expect(res.status).toBe(401);
  });
});

describe('Regression – Subscription Plans', () => {
  it('GET /api/subscriptions/plans returns plan list', async () => {
    global.mockPrisma.plan.findMany.mockResolvedValue([mockPlan]);

    const res = await request(app).get('/api/subscriptions/plans');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
