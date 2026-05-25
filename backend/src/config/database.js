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

async function connectDatabase() {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected');
  } catch (err) {
    logger.warn('Database not ready yet, will connect on first query', { error: err.message });
  }
}

module.exports = { prisma, connectDatabase };
