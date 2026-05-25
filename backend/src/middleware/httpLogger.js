/**
 * Express middleware to log HTTP requests/responses to DB.
 */
const logger = require('../config/logger');

function httpLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    try {
      logger.info('HTTP', `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`, {
        meta: {
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          durationMs: duration,
          userId: req.user?.id,
          ip: req.ip,
        },
      });
    } catch {
      // never crash on logging
    }
  });
  next();
}

module.exports = httpLogger;
