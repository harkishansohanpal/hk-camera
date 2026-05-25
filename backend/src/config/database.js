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

prisma.$on('error', (e) => {
  if (e.message?.includes('connection') || e.message?.includes('Closed')) {
    logger.warn('Prisma connection lost, will reconnect on next query', { message: e.message });
  } else {
    logger.error('Prisma error', { message: e.message });
  }
});
prisma.$on('warn',  (e) => logger.warn('Prisma warn',  { message: e.message }));
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => logger.debug('Prisma query', { query: e.query, duration: e.duration }));
}

async function connectDatabase(retries = 5, delay = 2000) {
  // Lazy connect — Prisma will connect on first query if not already connected
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$connect();
      logger.info('✅ Database connected');
      return;
    } catch (err) {
      logger.error(`Database connection attempt ${i + 1}/${retries} failed`, { error: err.message });
      if (i < retries - 1) await new Promise((r) => setTimeout(r, delay * (i + 1)));
      else throw err;
    }
  }
}

module.exports = { prisma, connectDatabase };
