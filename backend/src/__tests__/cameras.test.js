const request = require('supertest');
const { app, server } = require('../index');
const jwt = require('jsonwebtoken');

const userId = 'user-camera-owner';
const otherUserId = 'user-other';

function authToken(uid = userId) {
  return jwt.sign({ sub: uid }, process.env.JWT_SECRET, { expiresIn: '15m' });
}

const mockCamera = {
  id: 'cam-001',
  name: 'Front Door',
  description: 'Front door camera',
  streamKey: 'sk-abc-123',
  isOnline: false,
  motionDetect: true,
  sensitivity: 30,
  detectionMode: 'PIXEL_DIFF',
  mlConfidence: 50,
  nightVision: false,
  twoWayAudio: true,
  recordOnMotion: false,
  exposure: 0,
  focus: 50,
  whiteBalance: 'auto',
  iso: 100,
  brightness: 50,
  contrast: 50,
  userId,
  lastSeen: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockAuthUser = {
  id: userId,
  email: 'owner@example.com',
  name: 'Camera Owner',
  role: 'USER',
};

beforeEach(() => {
  jest.clearAllMocks();
  // Authenticate middleware needs a user lookup to succeed
  global.mockPrisma.user.findUnique.mockImplementation(({ where: { id } }) => {
    if (id === userId) return Promise.resolve(mockAuthUser);
    if (id === otherUserId) return Promise.resolve({ ...mockAuthUser, id: otherUserId, email: 'other@example.com' });
    return Promise.resolve(null);
  });
});

afterAll(() => {
  server.close();
});

describe('GET /api/cameras', () => {
  it('lists cameras for authenticated user', async () => {
    global.mockPrisma.camera.findMany.mockResolvedValue([mockCamera]);

    const res = await request(app)
      .get('/api/cameras')
      .set('Authorization', `Bearer ${authToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(mockCamera.id);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/cameras');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/cameras', () => {
  it('creates a camera', async () => {
    global.mockPrisma.camera.create.mockResolvedValue(mockCamera);

    const res = await request(app)
      .post('/api/cameras')
      .set('Authorization', `Bearer ${authToken()}`)
      .send({ name: 'Front Door', sensitivity: 30 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Front Door');
  });

  it('returns 422 without name', async () => {
    const res = await request(app)
      .post('/api/cameras')
      .set('Authorization', `Bearer ${authToken()}`)
      .send({});

    expect(res.status).toBe(422);
  });
});

describe('GET /api/cameras/:cameraId', () => {
  it('gets a camera by id', async () => {
    global.mockPrisma.camera.findUnique.mockResolvedValue(mockCamera);

    const res = await request(app)
      .get(`/api/cameras/${mockCamera.id}`)
      .set('Authorization', `Bearer ${authToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(mockCamera.id);
  });

  it('returns 404 for non-existent camera', async () => {
    global.mockPrisma.camera.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/cameras/nonexistent')
      .set('Authorization', `Bearer ${authToken()}`);

    expect(res.status).toBe(404);
  });

  it('returns 403 for another users camera', async () => {
    const otherCamera = { ...mockCamera, userId: otherUserId };
    global.mockPrisma.camera.findUnique.mockResolvedValue(otherCamera);

    const res = await request(app)
      .get(`/api/cameras/${mockCamera.id}`)
      .set('Authorization', `Bearer ${authToken()}`);

    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/cameras/:cameraId', () => {
  it('updates a camera', async () => {
    const updated = { ...mockCamera, name: 'Back Door', detectionMode: 'ML' };
    global.mockPrisma.camera.findUnique.mockResolvedValue(mockCamera);
    global.mockPrisma.camera.update.mockResolvedValue(updated);

    const res = await request(app)
      .patch(`/api/cameras/${mockCamera.id}`)
      .set('Authorization', `Bearer ${authToken()}`)
      .send({ name: 'Back Door', detectionMode: 'ML' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Back Door');
  });
});

describe('DELETE /api/cameras/:cameraId', () => {
  it('deletes a camera', async () => {
    global.mockPrisma.camera.findUnique.mockResolvedValue(mockCamera);
    global.mockPrisma.camera.delete.mockResolvedValue(mockCamera);

    const res = await request(app)
      .delete(`/api/cameras/${mockCamera.id}`)
      .set('Authorization', `Bearer ${authToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/cameras/:cameraId/stream-key', () => {
  it('returns the stream key', async () => {
    global.mockPrisma.camera.findUnique.mockResolvedValue(mockCamera);

    const res = await request(app)
      .get(`/api/cameras/${mockCamera.id}/stream-key`)
      .set('Authorization', `Bearer ${authToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.streamKey).toBe(mockCamera.streamKey);
  });
});

describe('POST /api/cameras/:cameraId/stream-key/rotate', () => {
  it('rotates the stream key', async () => {
    global.mockPrisma.camera.findUnique.mockResolvedValue(mockCamera);
    global.mockPrisma.camera.update.mockResolvedValue({ streamKey: 'new-sk-xyz' });

    const res = await request(app)
      .post(`/api/cameras/${mockCamera.id}/stream-key/rotate`)
      .set('Authorization', `Bearer ${authToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.streamKey).toBe('new-sk-xyz');
  });
});

describe('POST /api/cameras/:cameraId/heartbeat', () => {
  it('updates online status', async () => {
    global.mockPrisma.camera.findUnique.mockResolvedValue(mockCamera);
    global.mockPrisma.camera.update.mockResolvedValue({ ...mockCamera, isOnline: true });

    const res = await request(app)
      .post(`/api/cameras/${mockCamera.id}/heartbeat`)
      .set('Authorization', `Bearer ${authToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
