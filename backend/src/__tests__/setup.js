// ── Test environment ───────────────────────────────────────────
process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // random port
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.STORAGE_STRATEGY = 'local';
process.env.LOCAL_UPLOAD_DIR = './uploads';
process.env.LOCAL_RECORDING_DIR = './recordings';
process.env.RATE_LIMIT_WINDOW_MS = '900000';
process.env.RATE_LIMIT_MAX = '1000';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_mock';

// ── Mock Prisma ────────────────────────────────────────────────
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  camera: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  alert: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  recording: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
  },
  plan: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
  subscription: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn(),
  },
  log: {
    createMany: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  $disconnect: jest.fn(),
  $on: jest.fn(),
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
  Prisma: {
    ModelName: { User: 'User', Camera: 'Camera', Alert: 'Alert', Recording: 'Recording' },
  },
}));

// ── Mock dependencies ──────────────────────────────────────────
jest.mock('../config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../config/database', () => ({
  connectDatabase: jest.fn().mockResolvedValue(),
  prisma: mockPrisma,
}));

jest.mock('../config/redis', () => ({
  connectRedis: jest.fn().mockResolvedValue(),
}));

const mockIO = {
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(),
};
jest.mock('../socket/signalingServer', () => ({
  initSignalingServer: jest.fn(),
  getIO: jest.fn(() => mockIO),
  isCameraOnline: jest.fn(() => false),
  hasCameraViewers: jest.fn(() => false),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn((pw) => Promise.resolve(`hashed_${pw}`)),
  compare: jest.fn((pw, hash) => Promise.resolve(hash === `hashed_${pw}`)),
}));

jest.mock('stripe', () => {
  const mockStripe = jest.fn(() => ({
    checkout: { sessions: { create: jest.fn() } },
    billingPortal: { sessions: { create: jest.fn() } },
    subscriptions: {
      retrieve: jest.fn(),
      update: jest.fn(),
      cancel: jest.fn(),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_mock' }),
      retrieve: jest.fn(),
    },
  }));
  return mockStripe;
});

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-msg-id' }),
  })),
}));

jest.mock('web-push', () => ({
  sendNotification: jest.fn().mockResolvedValue({}),
  setVapidDetails: jest.fn(),
}));

global.mockPrisma = mockPrisma;
