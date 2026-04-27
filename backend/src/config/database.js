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

async function connectDatabase() {
  await prisma.$connect();
  logger.info('✅ Database connected');
}

module.exports = { prisma, connectDatabase };
