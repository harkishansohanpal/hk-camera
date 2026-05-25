const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const prisma = new PrismaClient({
  log: [
    { level: 'error', emit: 'event' },
    { level: 'warn',  emit: 'event' },
    ...(process.env.NODE_ENV === 'development'
      ? [{ level: 'query', emit: 'event' }]
      : []),
  ],
});

prisma.$on('error', (e) => logger.error('Prisma error', { message: e.message }));
prisma.$on('warn',  (e) => logger.warn('Prisma warn',  { message: e.message }));
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => logger.debug('Prisma query', { query: e.query, duration: e.duration }));
}

const KEEPALIVE_INTERVAL_MS = 30_000;

async function connectDatabase(retries = 5, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$connect();
      logger.info('✅ Database connected');
      const url = process.env.DATABASE_URL || '';
      if (!url.includes('sslmode=require') && !url.includes('sslmode=verify-full')) {
        if (process.env.NODE_ENV !== 'production') {
          logger.warn('⚠️  DATABASE_URL does not enforce SSL (missing sslmode=require). Add it in production: ?sslmode=require');
        }
      }
      // Start connection keepalive
      setInterval(() => {
        prisma.$queryRaw`SELECT 1`.catch((err) => {
          logger.warn('DB keepalive failed, will retry', { error: err.message });
        });
      }, KEEPALIVE_INTERVAL_MS);
      return;
    } catch (err) {
      logger.error(`Database connection attempt ${i + 1}/${retries} failed`, { error: err.message });
      if (i < retries - 1) await new Promise((r) => setTimeout(r, delay));
      else throw err;
    }
  }
}

module.exports = { prisma, connectDatabase };
