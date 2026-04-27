const { createClient } = require('redis');
const logger = require('./logger');

let redisClient = null;

async function connectRedis() {
  redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });

  redisClient.on('error', (err) => logger.error('Redis error', { err: err.message }));
  redisClient.on('connect', () => logger.info('✅ Redis connected'));

  await redisClient.connect();
  return redisClient;
}

function getRedis() {
  if (!redisClient) throw new Error('Redis not initialised. Call connectRedis() first.');
  return redisClient;
}

module.exports = { connectRedis, getRedis };
