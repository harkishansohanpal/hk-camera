const request = require('supertest');
const { app, server } = require('../index');
const jwt = require('jsonwebtoken');

const mockUser = {
  id: 'user-abc-123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'USER',
  passwordHash: 'hashed_password123',
  createdAt: new Date().toISOString(),
};

const mockRefreshTokenRecord = {
  token: 'mock-refresh-token-value',
  userId: mockUser.id,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
};

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  server.close();
});

describe('POST /api/auth/register', () => {
  it('registers a new user', async () => {
    global.mockPrisma.user.findUnique.mockResolvedValue(null);
    global.mockPrisma.user.create.mockResolvedValue({
      id: mockUser.id,
      email: mockUser.email,
      name: mockUser.name,
      role: mockUser.role,
      createdAt: mockUser.createdAt,
    });
    global.mockPrisma.refreshToken.create.mockResolvedValue(mockRefreshTokenRecord);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: mockUser.email, password: 'password123', name: mockUser.name, consent: true, turnstileToken: 'test-token' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(mockUser.email);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  it('returns 409 if email already in use', async () => {
    global.mockPrisma.user.findUnique.mockResolvedValue(mockUser);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: mockUser.email, password: 'password123', name: mockUser.name, consent: true, turnstileToken: 'test-token' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('returns 422 for invalid input', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'short', name: '' });

    expect(res.status).toBe(422);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with valid credentials', async () => {
    global.mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    global.mockPrisma.refreshToken.create.mockResolvedValue(mockRefreshTokenRecord);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: mockUser.email, password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  it('returns 401 for wrong password', async () => {
    global.mockPrisma.user.findUnique.mockResolvedValue(mockUser);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: mockUser.email, password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 for non-existent user', async () => {
    global.mockPrisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@example.com', password: 'password123' });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/refresh', () => {
  it('rotates tokens with valid refresh token', async () => {
    const validRefreshToken = jwt.sign(
      { sub: mockUser.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    global.mockPrisma.refreshToken.findUnique.mockResolvedValue({
      token: validRefreshToken,
      userId: mockUser.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    global.mockPrisma.refreshToken.delete.mockResolvedValue({});
    global.mockPrisma.refreshToken.create.mockResolvedValue({});

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: validRefreshToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  it('returns 401 with invalid refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'bogus-token' });

    expect(res.status).toBe(401);
  });

  it('returns 422 without refresh token', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});
    expect(res.status).toBe(422);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the authenticated user', async () => {
    const accessToken = jwt.sign({ sub: mockUser.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
    global.mockPrisma.user.findUnique.mockResolvedValue(mockUser);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(mockUser.email);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with expired token', async () => {
    const expiredToken = jwt.sign({ sub: mockUser.id }, process.env.JWT_SECRET, { expiresIn: '0s' });
    await new Promise(r => setTimeout(r, 100));

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
  });

  it('returns 401 if user not found', async () => {
    const accessToken = jwt.sign({ sub: 'nonexistent-id' }, process.env.JWT_SECRET, { expiresIn: '15m' });
    global.mockPrisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('logs out successfully', async () => {
    global.mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

    const res = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken: 'some-token' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
